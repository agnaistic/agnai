import { AppLog } from '../middleware'
import { CompletionItem, GenerateRequestV2 } from './type'
import { replaceTags } from '/common/presets/templates'
import { AssembledPrompt } from '/common/prompt'
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
  messages: Array<{ role: string; content: any }>
) {
  if (!opts.imageData) return messages

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'user') continue
    msg.content = [
      { type: 'text', text: msg.content },
      { type: 'image_url', image_url: { url: opts.imageData } },
    ]
    break
  }

  return messages
}

export async function toChatMessages(
  opts: GenerateRequestV2,
  assembled: AssembledPrompt,
  counter: TokenCounter
) {
  // const sections = promptOrderToSections({
  //   format: opts.gen.modelFormat,
  //   order: opts.gen.promptOrder,
  // })

  const { sections } = assembled
  const {
    strictSystem,
    sections: { post, history, post_system },
  } = sections

  const prefill = await parse(opts, counter, opts.settings?.prefill || '')

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

  let offset = history.length > opts.lines.length ? -1 : 0
  const sender = (opts.impersonate?.name || opts.sender.handle) + ':'
  let lastRole = ''
  for (let i = 0; i < history.length; i++) {
    const isPreHistory = offset !== 0 && i === 0
    const line = history[i]
    const original = opts.lines[i + offset]
    const role = isPreHistory ? 'user' : original?.startsWith(sender) ? 'user' : 'assistant'
    messages.push({ role, content: line })
    lastRole = role
  }

  const postContent = (post.join('') + (prefill.parsed.length ? ` ${prefill.parsed}` : '')).trim()

  if (lastRole === 'user') {
    const lastMsg = messages[messages.length - 1]
    lastMsg.content = lastMsg.content.trim() + `\n\n${postContent}`
  } else {
    messages.push({
      role: 'user',
      content: postContent,
    })
  }

  return messages
}

export function stripImageContent(messages: any[]) {
  if (!messages) return []
  if (!Array.isArray(messages)) return messages

  const last = messages.slice(-1)[0]
  const content = last?.content || last?.parts
  if (!content) return messages

  const next = messages.slice(0, -1).concat({
    role: 'user',
    content: content.map((c: any) => {
      if (c.type !== 'image_url' && !c.inlineData) return c
      return { type: 'image_url', image_url: '[REDACTED]' }
    }),
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
