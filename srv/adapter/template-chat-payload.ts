import { AppLog } from '../middleware'
import { CompletionItem, GenerateRequestV2 } from './type'
import { replaceTags } from '/common/presets/templates'
import { assemblePrompt } from '/common/prompt'
import { parseTemplate } from '/common/template-parser'
import { AppSchema, TokenCounter } from '/common/types'

export function renderMessagesToPrompt(
  preset: AppSchema.GenSettings,
  messages: Array<{ role: string; content: string }>
) {
  const output: string[] = []

  const systems: string[] = []
  let lastTag: 'system' | 'user' | 'bot' = messages[0]?.role as any

  for (let i = 0; i < messages.length; ++i) {
    const msg = messages[i]
    const tag = msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'bot'

    if (tag === 'system') {
      systems.push(msg.content)
    }

    if (systems.length && tag !== 'system') {
      output.push(`<system>${systems.join('\n\n').replace(/\n\n+/g, '\n\n')}</system>`)
      systems.length = 0
    }

    if (tag !== 'system') {
      output.push(`<${tag}>${msg.content}</${tag}>`)
    }
  }

  if (systems.length) {
    output.push(`<system>${systems.join('\n\n').replace(/\n\n+/g, '\n\n')}</system>`)
  }

  if (lastTag !== 'bot') {
    output.push(`<bot>`)
  }

  const template = output.filter((o) => !!o.trim()).join('\n\n')
  const prompt = replaceTags(template, preset.modelFormat || 'None')
  return { prompt, stop: replaceTags('</bot>', preset.modelFormat || 'None') }
}

/**
 * @destructive
 * mutates the messages list: adds the image data (base64) to the last user message
 */
export function insertImageContent(
  opts: { imageData?: string },
  messages: Array<{ role: string; content: any }>,
  block?: {}
) {
  if (!opts.imageData || !messages) return messages

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'user') continue
    msg.content = [
      { type: 'text', text: msg.content },
      block || { type: 'image_url', image_url: { url: opts.imageData } },
    ]
    break
  }

  return messages
}

export async function toChatMessages(req: GenerateRequestV2, counter: TokenCounter) {
  const assembled = await assemblePrompt(req, counter)

  const { sections } = assembled
  const {
    strictSystem,
    sections: { post, history, post_system },
  } = sections

  const prefill = await parse(req, counter, req.settings?.prefill || '')

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }> = []
  const systemPrompt = strictSystem.join('').trim().replace(/\n\n+/g, '\n\n')
  const postSystem = post_system.join('').trim().replace(/\n\n+/g, '\n\n')

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: strictSystem.join('').trim().replace(/\n\n+/g, '\n\n'),
    })
  }

  if (postSystem) {
    messages.push({ role: 'user', content: postSystem })
  }

  let offset = history.length > req.lines.length ? -1 : 0
  const sender = (req.impersonate?.name || req.sender.handle) + ':'
  // let lastRole = ''
  for (let i = 0; i < history.length; i++) {
    const isPreHistory = offset !== 0 && i === 0
    const line = history[i]
    const original = req.lines[i + offset]
    const role = isPreHistory ? 'user' : original?.startsWith(sender) ? 'user' : 'assistant'
    messages.push({ role, content: line.trim() })
    // lastRole = role
  }

  const postContent = post.join('').trim()

  // if (lastRole === 'user') {
  //   const lastMsg = messages[messages.length - 1]
  //   lastMsg.content = lastMsg.content.trim()
  // } else {
  //   messages.push({
  //     role: 'user',
  //     content: postContent,
  //   })
  // }

  const prefillText = prefill.parsed.length ? ` ${prefill.parsed.trim()}` : ''
  messages.push({ role: 'assistant', content: `${postContent}${prefillText}` })

  return { messages, assembled }
}

export function validateChatMessagesWithImage(
  opts: { imageData?: string },
  messages: CompletionItem[]
) {
  let lastRole = ''
  const next: CompletionItem[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (lastRole !== msg.role) {
      lastRole = msg.role
      next.push(msg)
      continue
    }

    const last = next.slice(-1)[0]
    if (last) {
      next[next.length - 1] = {
        ...last,
        content: `${last.content.trim()}\n\n${msg.content}`,
      }
      continue
    }
  }

  if (opts.imageData) {
    const inserted = insertImageContent(opts, next)
    return inserted
  }

  return next
}

export function stripImageContent(messages: any[]) {
  if (!messages) return []
  if (!Array.isArray(messages)) return messages

  const next = messages.map((msg) => {
    if (!Array.isArray(msg.content)) return msg
    const text = msg.content.find((m: any) => m.type === 'text')
    return { ...msg, content: [text, { type: 'image_url', content: '[REDACTED]' }] }
  })

  return next
}

export function logPayload(logger: AppLog, payload: any) {
  if (!payload.messages) {
    logger.debug({ ...payload, prompt: null }, 'Payload')
    return
  }

  logger.debug({ ...payload, messages: null }, 'Payload')
}

/** Currently unused, intended to work with awful inflexible jinja templates */
export function ensureUserMessageFirst(messages: CompletionItem[]): CompletionItem[] {
  if (!messages.length) return messages

  const [first, second, ...rest] = messages
  if (first.role === 'user') return messages

  if (first.role === 'assistant') {
    messages.unshift({ role: 'user', content: '' })
    return messages
  }

  if (first.role === 'system') {
    if (!second) {
      messages.push({ role: 'user', content: '...' })
      return messages
    }

    if (second.role === 'user') return messages

    const next: CompletionItem[] = [first, { role: 'user', content: '' }, second, ...rest]
    return next
  }

  return messages
}

async function parse(opts: GenerateRequestV2, counter: TokenCounter, text: string, limit?: number) {
  const template = replaceTags(text, 'None')
  const { parsed, sections } = await parseTemplate(template, {
    char: opts.char,
    chat: opts.chat,
    jsonValues: {},
    sender: opts.sender,
    impersonate: opts.impersonate,
    lines: opts.lines,
    limit: limit ? { context: limit, encoder: counter } : undefined,
  })

  const count = await counter(parsed)

  return { parsed, count, sections }
}
