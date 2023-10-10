import needle from 'needle'
import { publishOne } from '../api/ws/handle'
import { getTokenCounter } from '../tokenize'
import { requestStream } from './stream'
import { AdapterProps } from './type'
import { OPENAI_MODELS } from '/common/adapters'
import { defaultPresets } from '/common/default-preset'
import { IMAGE_SUMMARY_PROMPT } from '/common/image'
import {
  BOT_REPLACE,
  SAMPLE_CHAT_MARKER,
  SELF_REPLACE,
  ensureValidTemplate,
  injectPlaceholders,
  insertsDeeperThanConvoHistory,
} from '/common/prompt'
import { AppSchema } from '/common/types'
import { escapeRegex } from '/common/util'
import { AppLog } from '../logger'

type Role = 'user' | 'assistant' | 'system'
type CompletionItem = { role: Role; content: string; name?: string }

type SplitSampleChatProps = {
  sampleChat: string
  char: string
  sender: string
  budget?: number
}

type CompletionContent<T> = Array<{ finish_reason: string; index: number } & ({ text: string } | T)>
type Inference = { message: { content: string; role: Role } }
type AsyncDelta = { delta: Partial<Inference['message']> }

type Completion<T = Inference> = {
  id: string
  created: number
  model: string
  object: string
  choices: CompletionContent<T>
  error?: { message: string }
}

type CompletionGenerator = (
  userId: string,
  url: string,
  headers: Record<string, string | string[] | number>,
  body: any,
  service: string,
  log: AppLog
) => AsyncGenerator<
  { error: string } | { error?: undefined; token: string },
  Completion | undefined
>

// We only ever use the OpenAI gpt-3 encoder
// Don't bother passing it around since we know this already
const encoder = () => getTokenCounter('openai', OPENAI_MODELS.Turbo)

const sampleChatMarkerCompletionItem: CompletionItem = {
  role: 'system',
  content: SAMPLE_CHAT_MARKER.replace('System: ', ''),
}

/**
 * Yields individual tokens as OpenAI sends them, and ultimately returns a full completion object
 * once the stream is finished.
 */
export const streamCompletion: CompletionGenerator = async function* (
  userId,
  url,
  headers,
  body,
  service,
  log
) {
  const resp = needle.post(url, JSON.stringify(body), {
    parse: false,
    headers: {
      ...headers,
      Accept: 'text/event-stream',
    },
  })

  const tokens = []
  let meta = { id: '', created: 0, model: '', object: '', finish_reason: '', index: 0 }
  let current: any = {}

  try {
    const events = requestStream(resp)
    let prev = ''
    for await (const event of events) {
      if (!event.data) {
        continue
      }

      if (event.type === 'ping') {
        continue
      }

      if (event.data === '[DONE]') {
        break
      }

      current = event
      prev += event.data

      // If we fail to parse we might need to parse with this bad data and the next event's data...
      // So we'll keep it and try again next iteration
      // tryParse() will attempt to parse with the current .data payload _before_ prepending with the previous attempt (if present)
      const parsed = tryParse<Completion<AsyncDelta>>(event.data, prev)
      if (!parsed) continue

      // If we successfully parsed, ensure 'prev' is cleared so subsequent tryParse attempts don't have dangling data
      prev = ''

      const { choices, ...evt } = parsed
      if (!choices || !choices[0]) {
        log.warn({ sse: event }, `[${service}] Received invalid SSE during stream`)

        const message = evt.error?.message
          ? `${service} interrupted the response: ${evt.error.message}`
          : `${service} interrupted the response`

        if (!tokens.length) {
          yield { error: message }
          return
        }

        publishOne(userId, { type: 'notification', level: 'warn', message })
        break
      }

      const { finish_reason, index, ...choice } = choices[0]

      meta = { ...evt, finish_reason, index }

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
    log.error({ err, current }, `${service} streaming request failed`)
    yield { error: `${service} streaming request failed: ${err.message}` }
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

/**
 * This function contains the inserts logic for Chat models (Turbo, GPT4...)
 * This logic also exists in other places:
 * - common/prompt.ts fillPromptWithLines
 * - srv/adapter/claude.ts createClaudePrompt
 */
export function toChatCompletionPayload(opts: AdapterProps, maxTokens: number): CompletionItem[] {
  if (opts.kind === 'plain') {
    return [{ role: 'system', content: opts.prompt }]
  }

  const { lines, parts, gen, replyAs } = opts

  const messages: CompletionItem[] = []
  const history: CompletionItem[] = []

  const handle = opts.impersonate?.name || opts.sender?.handle || 'You'
  const { parsed: gaslight, inserts } = injectPlaceholders(
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

  let maxBudget =
    (gen.maxContextLength || defaultPresets.openai.maxContextLength) -
    maxTokens -
    encoder()([...inserts.values()].join(' '))
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
    }).parsed
    tokens += encoder()(post.content)
    history.push(post)
  }

  const examplePos = all.findIndex((l) => l.includes(SAMPLE_CHAT_MARKER))

  let i = all.length - 1
  let addedAllInserts = false
  const addRemainingInserts = () => {
    const remainingInserts = insertsDeeperThanConvoHistory(inserts, all.length - i)
    if (remainingInserts) {
      history.push({
        role: 'system',
        content: remainingInserts,
      })
    }
  }
  while (i >= 0) {
    const distanceFromBottom = all.length - 1 - i

    const line = all[i]

    const obj: CompletionItem = {
      role: 'assistant',
      content: line.trim().replace(BOT_REPLACE, replyAs.name).replace(SELF_REPLACE, handle),
    }

    const isSystem = line.startsWith('System:')
    const isUser = line.startsWith(handle)
    const isBot = !isUser && !isSystem

    const insert = inserts.get(distanceFromBottom)
    if (insert) history.push({ role: 'system', content: insert })

    if (i === examplePos) {
      addRemainingInserts()
      addedAllInserts = true

      const { additions, consumed } = splitSampleChat({
        budget: maxBudget - tokens,
        sampleChat: obj.content,
        char: replyAs.name,
        sender: handle,
      })

      if (tokens + consumed > maxBudget) {
        --i
        continue
      }
      history.push(...additions.reverse())
      tokens += consumed
      --i
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
    if (tokens + length > maxBudget) {
      --i
      break
    }
    tokens += length
    history.push(obj)
    --i
  }
  if (!addedAllInserts) {
    addRemainingInserts()
  }
  return messages.concat(history.reverse())
}

export function splitSampleChat(opts: SplitSampleChatProps) {
  const { sampleChat, char, sender, budget } = opts
  const regex = new RegExp(
    `(?<=\\n)(?=${escapeRegex(char)}:|${escapeRegex(sender)}:|System:|<start>)`,
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

    const sample = trimmed.toLowerCase().startsWith('system:') ? trimmed.slice(7).trim() : trimmed
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

function getPostInstruction(
  opts: AdapterProps,
  messages: CompletionItem[]
): CompletionItem | undefined {
  let prefix = opts.parts.ujb ? `${opts.parts.ujb}\n\n` : ''

  prefix = injectPlaceholders(prefix, {
    opts,
    parts: opts.parts,
    lastMessage: opts.lastMessage,
    characters: opts.characters || {},
    encoder: encoder(),
  }).parsed

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

function getCharLooks(char: AppSchema.Character) {
  if (char.persona?.kind === 'text') return

  const visuals = [
    char.persona?.attributes?.looks || '',
    char.persona?.attributes?.appearance || '',
  ].filter((v) => !!v)

  if (!visuals.length) return
  return `${char.name}'s appearance: ${visuals.join(', ')}`
}

function tryParse<T = any>(value: string, prev?: string): T | undefined {
  try {
    const parsed = tryParse(value)
    if (parsed) return parsed

    if (!prev) return JSON.parse(value)

    const joined = JSON.parse(prev + value)
    return joined
  } catch (ex) {
    return
  }
}
