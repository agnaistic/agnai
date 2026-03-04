import needle from 'needle'
import { ModelAdapter, AdapterProps, CompletionItem } from './type'
import { decryptText } from '../db/util'
import { defaultPresets } from '../../common/presets'
import {
  SAMPLE_CHAT_PREAMBLE,
  BOT_REPLACE,
  injectPlaceholders,
  ensureValidTemplate,
  START_REPLACE,
  SAMPLE_CHAT_MARKER,
  insertsDeeperThanConvoHistory,
} from '../../common/prompt'
import { AppLog } from '../middleware'
import { getTokenCounter } from '../tokenize'
import { toChatCompletionPayload } from './chat-completion'
import { sendOne } from '../api/ws'
import { joinUrl, sanitiseAndTrim } from '/common/requests/util'
import { GenSettings } from '/common/types/presets'
import { OPENAI_MODELS } from '/common/presets/openai'
import { CLAUDE_MODELS, CLAUDE_TEXT_MODELS } from '/common/presets/claude'
import { fetchStream } from '/common/requests/stream'
import { remapMessages } from './template-chat-payload'
import { getMimeTypeBase64 } from '/common/util'
import { getStoppingStrings } from '/common/requests/payloads'
import { stripImageContent, toChatMessages } from '/common/template-messages'

const CHAT_URL = `https://api.anthropic.com/v1/messages`
const TEXT_URL = `https://api.anthropic.com/v1/complete`
const apiVersion = '2023-06-01' // https://docs.anthropic.com/claude/reference/versioning

type ClaudeCompletion = {
  completion?: string
  content?: { type: string; text?: string }[]
  delta?: { text: string }
  text?: string
  stop_reason: string | null
  model: string
  /** If `stop_reason` is "stop_sequence", this is the particular stop sequence that was matched. */
  stop: string | null
  log_id: string
}

type CompletionGenerator = (opts: {
  url: string
  body: Record<string, any>
  headers: Record<string, any>
  signal: AbortController
  userId: string
  log: AppLog
}) => AsyncGenerator<{ error?: string; token?: string; meta?: any }, ClaudeCompletion | undefined>

const TEMP_TOPP_EXCLUSIVE: Record<string, boolean> = {
  'claude-haiku-4-5-20251001': false,
  'claude-sonnet-4-5-20250929': false,
  'claude-opus-4-1-20250805': false,
  'claude-opus-4-20250514': false,
  'claude-sonnet-4-20250514': false,
  'claude-3-haiku-20240307': false,
}

// There's no tokenizer for Claude, we use OpenAI's as an estimation
const encoder = () => getTokenCounter('claude', '')

export const handleClaude: ModelAdapter = async function* (opts) {
  let { members, user, log, guest, gen, isThirdParty } = opts
  if (gen.providerId) {
    isThirdParty = true
  }

  const claudeModel =
    gen.service === 'kobold'
      ? gen.thirdPartyModel || gen.claudeModel!
      : gen.thirdPartyModel || gen.claudeModel || CLAUDE_MODELS.ClaudeV37_Sonnet_Latest

  const base = getBaseUrl(gen, claudeModel || defaultPresets.claude.claudeModel, isThirdParty)

  if (!base.url) {
    yield { error: `Claude request failed: Your 'Third Party URL' is not set in your preset` }
    return
  }

  const apiKey = gen.providerId ? gen.thirdPartyKey : gen.thirdPartyKey || user.claudeApiKey
  if (!apiKey && !base.changed) {
    yield { error: `Claude request failed: Claude API key not set. Check your settings.` }
    return
  }

  const formatting = CLAUDE_TEXT_MODELS[claudeModel || '']
    ? 'text'
    : gen.service === 'claude-v2'
    ? 'v2'
    : 'v1'
  const stops = new Set([`\n\nHuman:`, `\n\nAssistant:`])
  const userStops = getStoppingStrings(opts, opts.gen)

  const payload: any = {
    model: claudeModel,
    temperature: Math.min(1, Math.max(0, gen.temp ?? defaultPresets.claude.temp)),
    stop_sequences: Array.from(stops),
    top_p: Math.min(1, Math.max(0, gen.topP ?? defaultPresets.claude.topP)),
    top_k: Math.min(1, Math.max(0, gen.topK ?? defaultPresets.claude.topK)),
    stream: gen.streamResponse ?? defaultPresets.claude.streamResponse,
  }

  if (formatting === 'v1') {
    // Original Claude service
    payload.max_tokens = gen.maxTokens
    const { messages, system } = await createClaudeChatCompletion(opts)
    payload.system = system
    payload.messages = messages
  } else if (formatting === 'v2') {
    // Using similar to openai-chatv2
    payload.max_tokens = gen.maxTokens
    const messages = opts.messages || []

    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n')

    payload.system = system
    payload.messages = messages.filter((m) => m.role !== 'system')
  } else {
    payload.max_tokens_to_sample = gen.maxTokens
    payload.prompt = await createClaudePrompt(opts)
  }

  if (payload.messages) {
    remapMessages(payload.messages, {
      text: (text) => {
        return { type: 'text', text }
      },
      image: (image) => {
        const mime = getMimeTypeBase64(image)
        return {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mime.mimeType,
            data: mime.data,
          },
        }
      },
    })
  }

  /**
   * Claude specifies that the budget must be GTE 1024, but less than MAX_TOKENS
   * Reasoning is not supported in any text (old) models
   */
  const exclusive = TEMP_TOPP_EXCLUSIVE[claudeModel] ?? true
  if (formatting === 'v2' && exclusive) {
    delete payload.top_p
  }

  if (formatting === 'v2' && gen.reasoning?.enabled) {
    const effort = gen.reasoning.effort || 'low'
    const max = opts.gen.maxTokens ?? 1024

    let budget = 0
    switch (effort) {
      case 'custom': {
        budget = gen.reasoning.maxTokens ?? 0
        break
      }

      case 'high': {
        budget = max * 0.8
        break
      }

      case 'medium': {
        budget = max * 0.5
        break
      }

      case 'low':
      default: {
        budget = max * 0.2
        break
      }
    }

    // Claude specifies that the thinking budget must be at least 1024 tokens
    if (budget < 1024) {
      budget = 1024
    }

    payload.max_tokens = budget + max
    payload.thinking = {
      type: 'enabled',
      budget_tokens: Math.floor(budget),
    }

    // Temperature must be 1 when thinking is enabled
    // Top K must be unset when thinking is enabled
    payload.temperature = 1
    payload.top_k = undefined

    // Last message must be 'thinking' block or role 'user'
    const lastMsg = payload.messages?.slice(-1)?.[0]
    if (lastMsg?.role === 'assistant') {
      lastMsg.role = 'user'
    }
  }

  if (opts.kind === 'plain') {
    payload.stream = false
  }

  const headers: any = {
    'Content-Type': 'application/json',
    'anthropic-version': apiVersion,
  }

  const key = !!guest ? apiKey : apiKey ? decryptText(apiKey!) : ''
  if (key) {
    headers['x-api-key'] = key
    headers.Authorization = `Bearer ${key}`
  }

  log.debug({ ...payload, prompt: null, messages: null }, 'Claude payload')
  log.debug(`Prompt:\n${payload.prompt}`)
  yield { prompt: payload.messages ? stripImageContent(payload.messages) : payload.prompt }

  const iterator = payload.stream
    ? streamCompletion({
        url: base.url,
        body: payload,
        headers,
        signal: opts.signal,
        log,
        userId: opts.user._id,
      })
    : requestFullCompletion({
        url: base.url,
        body: payload,
        headers,
        signal: opts.signal,
        log,
        userId: opts.user._id,
      })

  let acc = ''
  let resp: ClaudeCompletion | undefined

  while (true) {
    let generated = await iterator.next()

    if (generated.done) {
      resp = generated.value
      break
    }

    if ('error' in generated.value) {
      yield { error: generated.value.error }
      return
    }

    if ('meta' in generated.value) {
      yield { meta: generated.value.meta }
    }

    if ('token' in generated.value) {
      acc += generated.value.token
      yield {
        partial: sanitiseAndTrim({
          text: acc,
          char: opts.replyAs,
          members,
          gen: opts.gen,
          stops: userStops,
        }),
      }
    }

    if ('thoughts' in generated.value) {
      yield { thoughts: generated.value.thoughts! as string }
    }

    if ('tokens' in generated.value) {
      acc = generated.value.tokens! as string
      break
    }
  }

  try {
    const completion = resp?.completion || resp?.content?.[0]?.text || acc || ''
    if (!completion) {
      log.error({ body: resp }, 'Claude request failed: Empty response')
      yield { error: `Claude request failed: Received empty response. Try again.` }
    } else {
      yield sanitiseAndTrim({
        text: completion,
        char: opts.replyAs,
        members,
        gen: opts.gen,
      })
    }
  } catch (ex: any) {
    log.error({ err: ex }, 'Claude failed to parse')
    yield { error: `Claude request failed: ${ex.message}` }
    return
  }
}

function getBaseUrl(gen: Partial<GenSettings>, model: string, isThirdParty?: boolean) {
  const isChatModel = !CLAUDE_TEXT_MODELS[model]
  if (gen.providerId && (gen.service === 'claude' || gen.service === 'claude-v2')) {
    switch (isChatModel) {
      case true:
        return { url: joinUrl(gen.thirdPartyUrl!, 'messages'), changed: false }
      case false:
        return { url: joinUrl(gen.thirdPartyUrl!, 'complete'), changed: false }
    }
  }

  if (isThirdParty) {
    const url = gen.thirdPartyUrl
    return { url, changed: true }
  }

  if (CLAUDE_TEXT_MODELS[model]) {
    return { url: TEXT_URL, changed: false }
  }

  return { url: CHAT_URL, changed: false }
}

const requestFullCompletion: CompletionGenerator = async function* (params) {
  const resp = await needle('post', params.url, JSON.stringify(params.body), {
    json: true,
    signal: params.signal.signal,
    headers: params.headers,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    params.log.error({ error: resp.error }, 'Claude request failed to send')
    yield { error: `Claude request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    params.log.error({ body: resp.body }, `Claude request failed (${resp.statusCode})`)
    yield { error: `Claude request failed: ${resp.statusMessage}` }
    return
  }

  return resp.body
}

const streamCompletion: CompletionGenerator = async function* (opts) {
  const response = await fetch(opts.url, {
    body: JSON.stringify(opts.body),
    signal: opts.signal.signal,
    method: 'POST',
    headers: {
      ...opts.headers,
      Accept: 'text/event-stream',
    },
  })

  const tokens = []
  let meta: any = {}

  try {
    const local = opts.url !== TEXT_URL && opts.url !== CHAT_URL
    const events = fetchStream(response, {
      format: 'raw',
    })

    // https://docs.anthropic.com/claude/reference/streaming
    for await (const event of events) {
      const info = event?.delta || event?.message || {}
      if (info.stop_reason) {
        meta.stop_reason = info.stop_reason
      }

      if (info.model) {
        meta.model = info.model
      }

      if (info.usage?.tokens) {
        meta.output = info.usage.tokens
      }

      if (event.error !== undefined) {
        opts.log.warn(
          { error: event.error, errorObj: event.errorObj, url: opts.url },
          '[Claude] Received SSE error event'
        )
        const message = event.error
          ? `Anthropic interrupted the response: ${event.error?.message || event.error}`
          : `Anthropic interrupted the response.`
        if (!tokens.length) {
          yield { error: message, errorObj: event.errorObj }
          return
        }
        sendOne(opts.userId, { type: 'notification', level: 'warn', message })
        break
      }

      if (local) {
        const choice = event.choices?.[0]
        const delta: any = event.delta || choice || {}
        const token =
          delta.completion ||
          delta.delta?.text ||
          delta.text ||
          delta.delta?.content ||
          delta.content ||
          ''

        if (token) {
          tokens.push(token)
          yield { token }
        }

        if (delta.finish_reason) {
          meta.stop_reason = delta.finish_reason
        }

        continue
      }

      switch (event.type) {
        case 'completion':
        case 'content_block_delta':
          const delta: Partial<ClaudeCompletion> = event.delta
          const token = delta.completion || delta.delta?.text || delta.text || ''
          tokens.push(token)
          yield { token }
          break

        case 'error':
          opts.log.warn({ error: event }, '[Claude] Received SSE error event')
          const message = event.error?.message
            ? `Anthropic interrupted the response: ${event.error.message}`
            : `Anthropic interrupted the response.`

          if (!tokens.length) {
            yield { error: message }
            return
          }

          sendOne(opts.userId, { type: 'notification', level: 'warn', message })
          break

        case 'content_block_start':
        case 'content_block_stop':
        case 'message_delta':
        case 'message_start':
        case 'message_stop':
        case 'ping':
          break

        default:
          opts.log.warn({ event }, '[Claude] Received unrecognized SSE event')
          break
      }
    }
  } catch (err: any) {
    opts.log.error({ err }, '[Claude] SSE stream failed')
    yield { error: `Claude streaming request failed: ${err.message}` }
    return undefined
  }

  yield { meta }
  return
}

export async function createClaudeChatCompletionV2(opts: AdapterProps) {
  let messages = opts.messages
  if (!messages) {
    const result = await toChatMessages(opts, getTokenCounter('claude', ''))
    messages = result.messages
  }

  // Last message must be 'thinking' block or role 'user'
  const lastMsg = messages?.slice(-1)?.[0]
  if (lastMsg?.role === 'assistant') {
    lastMsg.role = 'user'
  }

  return messages
}

export async function createClaudeChatCompletion(opts: AdapterProps) {
  const result = {
    system: '',
    messages: opts.messages!,
  }

  if (!result.messages) {
    result.messages = await toChatCompletionPayload(
      opts,
      getTokenCounter('openai', OPENAI_MODELS.Turbo),
      opts.gen.maxTokens!
    )
  }

  // Claude doesn't have a system role, so we extract the first message to put it in the system
  // field (https://docs.anthropic.com/claude/docs/system-prompts)
  if (result.messages[0].role === 'system') {
    result.system = result.messages[0].content

    // Claude requires starting with a user message, and messages cannot be empty.
    result.messages[0].content = '...'
  }
  // Any system messages will go through the user instead.
  for (const message of result.messages) {
    if (message.role === 'system') {
      message.role = 'user'
    }
  }

  let last: CompletionItem<string>

  // We need to ensure each role alternates so we will naively merge consecutive messages :/
  result.messages = result.messages.reduce((msgs, msg) => {
    if (!last) {
      last = msg
      msgs.push(msg)
      return msgs
    }

    if (last.role !== msg.role) {
      last = msg
      msgs.push(msg)
      return msgs
    }

    if (last.content === '...') {
      last.content = ''
    }

    last.content += ('\n\n' + msg.content).trim()
    return msgs
  }, [] as CompletionItem<string>[])

  return result
}

/**
 * This function contains the inserts logic for Claude
 * This logic also exists in other places:
 * - common/prompt.ts fillPromptWithLines
 * - srv/adapter/chat-completion.ts toChatCompletionPayload
 */
async function createClaudePrompt(opts: AdapterProps) {
  if (opts.kind === 'plain') {
    return `\n\nHuman: ${opts.prompt}\n\nAssistant:`
  }

  const { parts, gen, replyAs } = opts
  const lines = opts.lines ?? []

  const maxContextLength = gen.maxContextLength || defaultPresets.claude.maxContextLength
  const maxResponseTokens = gen.maxTokens ?? defaultPresets.claude.maxTokens

  // Some API keys require that prompts start with this
  const mandatoryPrefix = '\n\nHuman: '

  const enc = encoder()

  const { parsed: rawGaslight, inserts } = await injectPlaceholders(
    ensureValidTemplate(gen.gaslight || defaultPresets.claude.gaslight, ['history', 'post']),
    {
      opts,
      parts,
      lastMessage: opts.lastMessage,
      characters: opts.characters || {},
      encoder: enc,
      jsonValues: opts.jsonValues,
    }
  )
  const gaslight = processLine('system', rawGaslight)
  const gaslightCost = await encoder()(mandatoryPrefix + gaslight)
  const { parsed } = await injectPlaceholders(parts.ujb ?? '', {
    opts,
    parts,
    encoder: enc,
    characters: opts.characters || {},
    jsonValues: opts.jsonValues,
  })

  const ujb = parsed ? processLine('system', parsed) : ''

  const prefill = opts.parts.prefill ? opts.parts.prefill + '\n' : ''
  const prefillCost = await enc(prefill)

  const maxBudget =
    maxContextLength -
    maxResponseTokens -
    gaslightCost -
    prefillCost -
    (await enc(ujb)) -
    (await enc(opts.replyAs.name + ':')) -
    (await enc([...inserts.values()].join(' ')))

  let tokens = 0
  const history: string[] = []

  const sampleAmble = SAMPLE_CHAT_PREAMBLE.replace(BOT_REPLACE, replyAs.name)
  const sender = opts.impersonate?.name ?? opts.sender.handle

  const all = lines.slice().reverse()
  const examplePos = all.findIndex((l) => l.includes(sampleAmble))
  let i = all.length - 1
  let addedAllInserts = false
  const addRemainingInserts = () => {
    const remainingInserts = insertsDeeperThanConvoHistory(inserts, all.length - i)
    if (remainingInserts) {
      history.push(processLine('system', remainingInserts))
    }
  }

  for (const line of all) {
    const distanceFromBottom = all.length - 1 - i
    const lineType: LineType = line.startsWith(sender)
      ? 'user'
      : line.startsWith('System:')
      ? 'system'
      : line.startsWith(sampleAmble)
      ? 'example'
      : 'char'
    if (distanceFromBottom === examplePos) {
      addRemainingInserts()
      addedAllInserts = true
    }

    const processedLine = processLine(lineType, line)
    const cost = await enc(processedLine)
    if (cost + tokens >= maxBudget) break
    const insert = inserts.get(distanceFromBottom)
    if (insert) history.push(processLine('system', insert))

    tokens += cost
    history.push(processedLine)
    --i
  }
  if (!addedAllInserts) {
    addRemainingInserts()
    addedAllInserts = true
  }

  const messages = [gaslight, ...history.reverse()]

  if (ujb) {
    messages.push(ujb)
  }

  const continueAddon =
    opts.kind === 'continue' ? processLine('system', `Continue ${replyAs.name}'s reply.`) : ''

  const appendName = opts.gen.prefixNameAppend ?? true
  // <https://console.anthropic.com/docs/prompt-design#what-is-a-prompt>
  return (
    mandatoryPrefix +
    messages.join('') +
    continueAddon +
    '\n\n' +
    'Assistant: ' +
    prefill +
    (appendName ? replyAs.name + ':' : '')
  )
}

type LineType = 'system' | 'char' | 'user' | 'example'

function processLine(type: LineType, line: string) {
  switch (type) {
    case 'user':
      return `\n\nHuman: ${line}`

    case 'system':
      return `\n\nSystem: ${line}`

    case 'example':
      const mid = line
        .replace(START_REPLACE, '<mod>New conversation started.</mod>')
        .replace('\n' + SAMPLE_CHAT_MARKER, '')
      return `\n\nHuman:\n<example_dialogue>\n${mid}\n</example_dialogue>`

    case 'char':
      return `\n\nAssistant: ${line || ''}`
  }
}
