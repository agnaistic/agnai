import needle from 'needle'
import { sanitiseAndTrim } from '../api/chat/common'
import { ModelAdapter, AdapterProps } from './type'
import { decryptText } from '../db/util'
import { defaultPresets } from '../../common/presets'
import {
  BOT_REPLACE,
  SAMPLE_CHAT_MARKER,
  SELF_REPLACE,
  ensureValidTemplate,
  injectPlaceholders,
} from '../../common/prompt'
import { OPENAI_CHAT_MODELS, OPENAI_MODELS } from '../../common/adapters'
import { StatusError } from '../api/wrap'
import { AppSchema } from '../db/schema'
import { getEncoder } from '../tokenize'
import { needleToSSE } from './stream'
import { adventureAmble } from '/common/default-preset'
import { IMAGE_SUMMARY_PROMPT } from '/common/image'
import { config } from '../config'

const baseUrl = `https://api.openai.com`

type Role = 'user' | 'assistant' | 'system'

type CompletionItem = { role: Role; content: string; name?: string }
type CompletionContent<T> = Array<{ finish_reason: string; index: number } & ({ text: string } | T)>
type Inference = { message: { content: string; role: Role } }
type AsyncDelta = { delta: Partial<Inference['message']> }

type Completion<T = Inference> = {
  id: string
  created: number
  model: string
  object: string
  choices: CompletionContent<T>
}

type CompletionGenerator = (
  url: string,
  headers: Record<string, string | string[] | number>,
  body: any
) => AsyncGenerator<
  { error: string } | { error?: undefined; token: string },
  Completion | undefined
>

// We only ever use the OpenAI gpt-3 encoder
// Don't bother passing it around since we know this already
const encoder = () => getEncoder('openai', OPENAI_MODELS.Turbo)

export const handleOAI: ModelAdapter = async function* (opts) {
  const { char, members, user, prompt, settings, log, guest, gen, kind, isThirdParty } = opts
  const base = getBaseUrl(user, isThirdParty)
  const handle = opts.impersonate?.name || opts.sender?.handle || 'You'
  if (!user.oaiKey && !base.changed) {
    yield { error: `OpenAI request failed: No OpenAI API key not set. Check your settings.` }
    return
  }
  const oaiModel = settings.oaiModel ?? defaultPresets.openai.oaiModel

  const maxResponseLength =
    opts.chat.mode === 'adventure' ? 400 : gen.maxTokens ?? defaultPresets.openai.maxTokens

  const body: any = {
    model: oaiModel,
    stream: (gen.streamResponse && kind !== 'summary') ?? defaultPresets.openai.streamResponse,
    temperature: gen.temp ?? defaultPresets.openai.temp,
    max_tokens: maxResponseLength,
    presence_penalty: gen.presencePenalty ?? defaultPresets.openai.presencePenalty,
    frequency_penalty: gen.frequencyPenalty ?? defaultPresets.openai.frequencyPenalty,
    top_p: gen.topP ?? 1,
    stop: `\n${handle}:`,
  }

  const useChat = !!OPENAI_CHAT_MODELS[oaiModel]

  if (useChat) {
    const messages: CompletionItem[] = config.inference.flatChatCompletion
      ? [{ role: 'system', content: opts.prompt }]
      : toChatCompletionPayload(opts, body.max_tokens)

    body.messages = messages
  } else {
    body.prompt = prompt
  }

  if (gen.antiBond) body.logit_bias = { 3938: -50, 11049: -50, 64186: -50, 3717: -25 }

  const useThirdPartyPassword = base.changed && isThirdParty && user.thirdPartyPassword
  const apiKey = useThirdPartyPassword
    ? user.thirdPartyPassword
    : !isThirdParty
    ? user.oaiKey
    : null
  const bearer = !!guest ? `Bearer ${apiKey}` : apiKey ? `Bearer ${decryptText(apiKey)}` : null

  const headers: any = {
    'Content-Type': 'application/json',
  }

  if (bearer) {
    headers.Authorization = bearer
  }

  log.debug(body, 'OpenAI payload')

  if ('messages' in body) {
    let count = 0
    for (const msg of body.messages) {
      count += encoder()(msg.content)
    }
    opts.log.info({ count }, 'OpenAI token count')
  }

  const url = useChat ? `${base.url}/chat/completions` : `${base.url}/completions`

  const iter = body.stream
    ? streamCompletion(url, headers, body)
    : requestFullCompletion(url, headers, body)
  let accumulated = ''
  let response: Completion<Inference> | undefined

  while (true) {
    let generated = await iter.next()

    // Both the streaming and non-streaming generators return a full completion and yield errors.
    if (generated.done) {
      response = generated.value
      break
    }

    if (generated.value.error) {
      yield generated.value
      return
    }

    // Only the streaming generator yields individual tokens.
    if ('token' in generated.value) {
      accumulated += generated.value.token
      yield { partial: sanitiseAndTrim(accumulated, prompt, char, opts.characters, members) }
    }
  }

  try {
    let text = getCompletionContent(response)
    if (!text?.length) {
      log.error({ body: response }, 'OpenAI request failed: Empty response')
      yield { error: `OpenAI request failed: Received empty response. Try again.` }
      return
    }

    yield sanitiseAndTrim(text, prompt, opts.replyAs, opts.characters, members)
  } catch (ex: any) {
    log.error({ err: ex }, 'OpenAI failed to parse')
    yield { error: `OpenAI request failed: ${ex.message}` }
    return
  }
}

function getBaseUrl(user: AppSchema.User, isThirdParty?: boolean) {
  if (isThirdParty && user.thirdPartyFormat === 'openai' && user.koboldUrl) {
    // If the user provides a versioned API URL for their third-party API, use that. Otherwise
    // fall back to the standard /v1 URL.
    const version = user.koboldUrl.match(/\/v\d+$/) ? '' : '/v1'
    return { url: user.koboldUrl + version, changed: true }
  }

  return { url: `${baseUrl}/v1`, changed: false }
}

export type OAIUsage = {
  daily_costs: Array<{ timestamp: number; line_item: Array<{ name: string; cost: number }> }>
  object: string
  total_usage: number
}

export async function getOpenAIUsage(oaiKey: string, guest: boolean): Promise<OAIUsage> {
  const key = guest ? oaiKey : decryptText(oaiKey)
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  }

  const date = new Date()
  date.setDate(1)
  const start_date = date.toISOString().slice(0, 10)

  date.setMonth(date.getMonth() + 1)
  const end_date = date.toISOString().slice(0, 10)

  const res = await needle(
    'get',
    `${baseUrl}/dashboard/billing/usage?start_date=${start_date}&end_date=${end_date}`,
    { headers }
  )
  if (res.statusCode && res.statusCode >= 400) {
    throw new StatusError(
      `Failed to retrieve usage (${res.statusCode}): ${res.body?.message || res.statusMessage}`,
      400
    )
  }

  return res.body
}

const requestFullCompletion: CompletionGenerator = async function* (url, headers, body) {
  const resp = await needle('post', url, JSON.stringify(body), {
    json: true,
    headers,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    yield { error: `OpenAI request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    const msg =
      resp.body?.error?.message || resp.body.message || resp.statusMessage || 'Unknown error'

    yield { error: `OpenAI request failed (${resp.statusCode}): ${msg}` }
    return
  }
  return resp.body
}

/**
 * Yields individual tokens as OpenAI sends them, and ultimately returns a full completion object
 * once the stream is finished.
 */
const streamCompletion: CompletionGenerator = async function* (url, headers, body) {
  const resp = needle.post(url, JSON.stringify(body), {
    parse: false,
    headers: {
      ...headers,
      Accept: 'text/event-stream',
    },
  })

  const tokens = []
  let meta = { id: '', created: 0, model: '', object: '', finish_reason: '', index: 0 }

  try {
    const events = needleToSSE(resp)
    for await (const event of events) {
      // According to OpenAI's docs their SSE stream only uses `data` events.
      if (!event.startsWith('data: ')) {
        continue
      }

      if (event === 'data: [DONE]') {
        break
      }

      const parsed: Completion<AsyncDelta> = JSON.parse(event.slice('data: '.length))
      const { choices, ...completionMeta } = parsed
      const { finish_reason, index, ...choice } = choices[0]

      meta = { ...completionMeta, finish_reason, index }

      if ('text' in choice) {
        const token = choice.text
        tokens.push(token)
        yield { token }
      } else if ('delta' in choice && choice.delta.content) {
        const token = choice.delta.content
        tokens.push(token)
        yield { token }
      }
    }
  } catch (err: any) {
    yield { error: `OpenAI streaming request failed: ${err.message}` }
    return
  }

  return {
    id: meta.id,
    created: meta.created,
    model: meta.model,
    object: meta.object,
    choices: [
      {
        finish_reason: meta.finish_reason,
        index: meta.index,
        text: tokens.join(''),
      },
    ],
  }
}

function getCompletionContent(completion?: Completion<Inference>) {
  if (!completion) {
    return ''
  }

  if ('text' in completion.choices[0]) {
    return completion.choices[0].text
  } else {
    return completion.choices[0].message.content
  }
}

function toChatCompletionPayload(opts: AdapterProps, maxTokens: number): CompletionItem[] {
  if (opts.kind === 'plain') {
    return [{ role: 'system', content: opts.prompt }]
  }

  const { lines, parts, gen, replyAs } = opts

  const messages: CompletionItem[] = []
  const history: CompletionItem[] = []

  const handle = opts.impersonate?.name || opts.sender?.handle || 'You'
  const gaslight = injectPlaceholders(
    ensureValidTemplate(gen.gaslight || defaultPresets.openai.gaslight, opts.parts, [
      'history',
      'post',
    ]),
    {
      opts,
      parts,
      lastMessage: opts.lastMessage,
      characters: opts.characters || {},
      encoder: encoder(),
    }
  )

  messages.push({ role: 'system', content: gaslight })

  const all = []

  let maxBudget = (gen.maxContextLength || defaultPresets.openai.maxContextLength) - maxTokens
  let tokens = encoder()(gaslight)

  if (lines) {
    all.push(...lines)
  }

  // Append 'postamble' and system prompt (ujb)
  const post = getPostInstruction(opts, messages)
  if (post) {
    post.content = injectPlaceholders(post.content, {
      opts,
      parts: opts.parts,
      lastMessage: opts.lastMessage,
      characters: opts.characters || {},
      encoder: encoder(),
    })
    tokens += encoder()(post.content)
    history.push(post)
  }

  const examplePos = all.findIndex((l) => l.includes(SAMPLE_CHAT_MARKER))

  for (let i = all.length - 1; i >= 0; i--) {
    const line = all[i]

    const obj: CompletionItem = {
      role: 'assistant',
      content: line.trim().replace(BOT_REPLACE, replyAs.name).replace(SELF_REPLACE, handle),
    }

    const isSystem = line.startsWith('System:')
    const isUser = line.startsWith(handle)
    const isBot = !isUser && !isSystem

    if (i === examplePos) {
      const { additions, consumed } = splitSampleChat({
        budget: maxBudget - tokens,
        sampleChat: obj.content,
        char: replyAs.name,
        sender: handle,
      })

      if (tokens + consumed > maxBudget) continue
      history.push(...additions.reverse())
      tokens += consumed
      continue
    } else if (isBot) {
    } else if (line === '<START>') {
      obj.role = sampleChatMarkerCompletionItem.role
      obj.content = sampleChatMarkerCompletionItem.content
    } else if (isSystem) {
      obj.role = 'system'
      obj.content = obj.content.replace('System:', '').trim()
    } else {
      obj.role = 'user'
    }

    const length = encoder()(obj.content)
    if (tokens + length > maxBudget) break
    tokens += length
    history.push(obj)
  }

  return messages.concat(history.reverse())
}

function getCharLooks(char: AppSchema.Character) {
  if (char.persona?.kind === 'text') return

  const visuals = [
    char.persona?.attributes?.looks || '',
    char.persona?.attributes?.appearance || '',
  ].filter((v) => !!v)

  if (!visuals.length) return
  return `${char.name}'s appearance: ${visuals.join(', ')}`
}

function getPostInstruction(
  opts: AdapterProps,
  messages: CompletionItem[]
): CompletionItem | undefined {
  let prefix = opts.parts.ujb ? `${opts.parts.ujb}\n\n` : ''

  if (opts.chat.mode === 'adventure') {
    prefix = `${adventureAmble}\n\n${prefix}`
  }

  prefix = injectPlaceholders(prefix, {
    opts,
    parts: opts.parts,
    lastMessage: opts.lastMessage,
    characters: opts.characters || {},
    encoder: encoder(),
  })

  switch (opts.kind) {
    // These cases should never reach here
    case 'plain':
    case 'ooc': {
      return
    }

    case 'continue':
      return { role: 'system', content: `${prefix}Continue ${opts.replyAs.name}'s response` }

    case 'summary': {
      let content = opts.user.images?.summaryPrompt || IMAGE_SUMMARY_PROMPT.openai

      if (!content.startsWith('(')) content = '(' + content
      if (!content.endsWith(')')) content = content + ')'

      const looks = Object.values(opts.characters || {})
        .map(getCharLooks)
        .filter((v) => !!v)
        .join('\n')

      if (looks) {
        messages[0].content += '\n' + looks
      }
      return { role: 'user', content }
    }

    case 'self':
      return {
        role: 'system',
        content: `${prefix}Respond as ${opts.impersonate?.name || opts.sender?.handle || 'You'}`,
      }

    case 'retry':
    case 'send':
    case 'request': {
      return { role: 'system', content: `${prefix}Respond as ${opts.replyAs.name}` }
    }
  }
}
const sampleChatMarkerCompletionItem: CompletionItem = {
  role: 'system',
  content: SAMPLE_CHAT_MARKER.replace('System: ', ''),
}

// https://stackoverflow.com/a/3561711
function escapeRegex(string: string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
}

type SplitSampleChatProps = {
  sampleChat: string
  char: string
  sender: string
  budget?: number
}

export function splitSampleChat(opts: SplitSampleChatProps) {
  const { sampleChat, char, sender, budget } = opts
  const regex = new RegExp(
    `(?<=\\n)(?=${escapeRegex(char)}:|${escapeRegex(sender)}:|<start>)`,
    'gi'
  )
  const additions: CompletionItem[] = []
  let tokens = 0

  for (const chat of sampleChat.replace(/\r\n/g, '\n').split(regex)) {
    const trimmed = chat.trim()
    if (!trimmed) continue

    // if the msg starts with <start> we consider everything between
    // <start> and the next placeholder a system message
    if (trimmed.toLowerCase().startsWith('<start>')) {
      const afterStart = trimmed.slice(7).trim()
      additions.push(sampleChatMarkerCompletionItem)
      tokens += encoder()(sampleChatMarkerCompletionItem.content)
      if (afterStart) {
        additions.push({ role: 'system' as const, content: afterStart })
        tokens += encoder()(afterStart)
      }
      continue
    }

    const sample = trimmed
    const role = sample.startsWith(char + ':')
      ? 'assistant'
      : sample.startsWith(sender + ':')
      ? 'user'
      : 'system'

    const msg: CompletionItem = {
      role: role,
      content: sample.replace(BOT_REPLACE, char).replace(SELF_REPLACE, sender),
    }

    const length = encoder()(msg.content)
    if (budget && tokens + length > budget) break

    additions.push(msg)
    tokens += length
  }

  return { additions, consumed: tokens }
}
