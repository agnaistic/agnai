import needle from 'needle'
import { sanitiseAndTrim } from '../api/chat/common'
import { requestStream } from './stream'
import { ModelAdapter, AdapterProps } from './type'
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
import { AppSchema } from '../../common/types/schema'
import { AppLog } from '../logger'
import { getTokenCounter } from '../tokenize'
import { publishOne } from '../api/ws/handle'
import { CLAUDE_CHAT_MODELS } from '/common/adapters'
import { CompletionItem, toChatCompletionPayload } from './chat-completion'

const CHAT_URL = `https://api.anthropic.com/v1/messages`
const TEXT_URL = `https://api.anthropic.com/v1/complete`
const apiVersion = '2023-06-01' // https://docs.anthropic.com/claude/reference/versioning

type ClaudeCompletion = {
  completion: string
  delta?: { text: string }
  text?: string
  stop_reason: string | null
  model: string
  /** If `stop_reason` is "stop_sequence", this is the particular stop sequence that was matched. */
  stop: string | null
  log_id: string
}

type CompletionGenerator = (
  url: string,
  body: Record<string, any>,
  headers: Record<string, string | string[] | number>,
  userId: string,
  log: AppLog
) => AsyncGenerator<{ error: string } | { token: string }, ClaudeCompletion | undefined>

// There's no tokenizer for Claude, we use OpenAI's as an estimation
const encoder = () => getTokenCounter('claude', '')

export const handleClaude: ModelAdapter = async function* (opts) {
  const { members, user, log, guest, gen, isThirdParty } = opts
  const claudeModel = gen.claudeModel ?? defaultPresets.claude.claudeModel
  const base = getBaseUrl(user, claudeModel, isThirdParty)
  if (!user.claudeApiKey && !base.changed) {
    yield { error: `Claude request failed: Claude API key not set. Check your settings.` }
    return
  }

  const useChat = !!CLAUDE_CHAT_MODELS[claudeModel]
  const stops = new Set([`\n\nHuman:`, `\n\nAssistant:`])

  const payload: any = {
    model: claudeModel,
    temperature: Math.min(1, Math.max(0, gen.temp ?? defaultPresets.claude.temp)),
    stop_sequences: Array.from(stops),
    top_p: Math.min(1, Math.max(0, gen.topP ?? defaultPresets.claude.topP)),
    top_k: Math.min(1, Math.max(0, gen.topK ?? defaultPresets.claude.topK)),
    stream: gen.streamResponse ?? defaultPresets.claude.streamResponse,
  }

  if (useChat) {
    payload.max_tokens = gen.maxTokens
    const messages = await toChatCompletionPayload(opts, gen.maxTokens!)

    let last: CompletionItem

    // We need to ensure each role alternates so we will naively merge consecutive messages :/
    payload.messages = messages.reduce((msgs, msg) => {
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

      last.content += '\n\n' + msg.content
      return msgs
    }, [] as CompletionItem[])
  } else {
    payload.max_tokens_to_sample = gen.maxTokens
    payload.prompt = await createClaudePrompt(opts)
  }

  if (opts.kind === 'plain') {
    payload.stream = false
  }

  const headers: any = {
    'Content-Type': 'application/json',
    'anthropic-version': apiVersion,
  }

  const useThirdPartyPassword =
    base.changed && isThirdParty && (gen.thirdPartyKey || user.thirdPartyPassword)
  const apiKey = useThirdPartyPassword
    ? gen.thirdPartyKey || user.thirdPartyPassword
    : !isThirdParty
    ? user.claudeApiKey
    : null

  const key = !!guest ? apiKey : apiKey ? decryptText(apiKey!) : null
  if (key) {
    headers['x-api-key'] = key
  }

  log.debug({ ...payload, prompt: null }, 'Claude payload')
  log.debug(`Prompt:\n${payload.prompt}`)
  yield { prompt: payload.prompt }

  const iterator = payload.stream
    ? streamCompletion(base.url, payload, headers, opts.user._id, log)
    : requestFullCompletion(base.url, payload, headers, opts.user._id, log)

  let acc = ''
  let resp: ClaudeCompletion | undefined

  while (true) {
    let generated = await iterator.next()

    if (generated.done) {
      resp = generated.value
      break
    }

    if ('error' in generated.value) {
      yield generated.value
      return
    }

    if ('token' in generated.value) {
      acc += generated.value.token
      yield {
        partial: sanitiseAndTrim(acc, payload.prompt, opts.replyAs, opts.characters, members),
      }
    }
  }

  try {
    const completion = resp?.completion || ''
    if (!completion) {
      log.error({ body: resp }, 'Claude request failed: Empty response')
      yield { error: `Claude request failed: Received empty response. Try again.` }
    } else {
      yield sanitiseAndTrim(completion, payload.prompt, opts.replyAs, opts.characters, members)
    }
  } catch (ex: any) {
    log.error({ err: ex }, 'Claude failed to parse')
    yield { error: `Claude request failed: ${ex.message}` }
    return
  }
}

function getBaseUrl(user: AppSchema.User, model: string, isThirdParty?: boolean) {
  if (isThirdParty && user.thirdPartyFormat === 'claude' && user.koboldUrl) {
    return { url: user.koboldUrl, changed: true }
  }

  if (CLAUDE_CHAT_MODELS[model]) {
    return { url: CHAT_URL, changed: false }
  }

  return { url: TEXT_URL, changed: false }
}

const requestFullCompletion: CompletionGenerator = async function* (
  url,
  body,
  headers,
  _userId,
  log
) {
  const resp = await needle('post', url, JSON.stringify(body), {
    json: true,
    headers,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    log.error({ error: resp.error }, 'Claude request failed to send')
    yield { error: `Claude request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    log.error({ body: resp.body }, `Claude request failed (${resp.statusCode})`)
    yield { error: `Claude request failed: ${resp.statusMessage}` }
    return
  }

  return resp.body
}

const streamCompletion: CompletionGenerator = async function* (url, body, headers, userId, log) {
  const resp = needle.post(url, JSON.stringify(body), {
    parse: false,
    headers: {
      ...headers,
      Accept: 'text/event-stream',
    },
  })

  const tokens = []
  let meta: Omit<ClaudeCompletion, 'completion'> = {
    stop_reason: null,
    model: '',
    stop: null,
    log_id: '',
  }

  try {
    const events = requestStream(resp)

    // https://docs.anthropic.com/claude/reference/streaming
    for await (const event of events) {
      if (event.error !== undefined) {
        log.warn({ error: event.error }, '[Claude] Received SSE error event')
        const message = event.error
          ? `Anthropic interrupted the response: ${event.error}`
          : `Anthropic interrupted the response.`
        if (!tokens.length) {
          yield { error: message }
          return
        }
        publishOne(userId, { type: 'notification', level: 'warn', message })
        break
      }

      switch (event.type) {
        case 'completion':
        case 'content_block_delta':
          const delta: Partial<ClaudeCompletion> = JSON.parse(event.data)
          const token = delta.completion || delta.delta?.text || delta.text || ''
          meta = { ...meta, ...delta }
          tokens.push(token)
          yield { token }
          break

        case 'error':
          const parsedError = JSON.parse(event.data)
          log.warn({ error: parsedError }, '[Claude] Received SSE error event')
          const message = parsedError?.error?.message
            ? `Anthropic interrupted the response: ${parsedError.error.message}`
            : `Anthropic interrupted the response.`

          if (!tokens.length) {
            yield { error: message }
            return
          }

          publishOne(userId, { type: 'notification', level: 'warn', message })
          break
        case 'ping':
          break

        default:
          log.warn({ event }, '[Claude] Received unrecognized SSE event')
          break
      }
    }
  } catch (err: any) {
    log.error({ err }, '[Claude] SSE stream failed')
    yield { error: `Claude streaming request failed: ${err.message}` }
    return
  }

  return { ...meta, completion: tokens.join('') }
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
    }
  )
  const gaslight = processLine('system', rawGaslight)
  const gaslightCost = await encoder()(mandatoryPrefix + gaslight)
  const { parsed } = await injectPlaceholders(parts.ujb ?? '', {
    opts,
    parts,
    encoder: enc,
    characters: opts.characters || {},
  })

  const ujb = parsed ? processLine('system', parsed) : ''

  const prefill = opts.gen.prefill ? opts.gen.prefill + '\n' : ''
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
