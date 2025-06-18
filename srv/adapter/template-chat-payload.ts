import { AppLog } from '../middleware'
import { CompletionItem, GenerateRequestV2 } from './type'
import { replaceTags } from '/common/presets/templates'
import { assemblePrompt } from '/common/prompt'
import { AppSchema, TokenCounter } from '/common/types'
import { findLast } from '/common/util'

export async function toChatMessages(req: GenerateRequestV2, counter: TokenCounter) {
  const assembled = await assemblePrompt(req, counter)

  const { sections } = assembled
  const {
    strictSystem,
    sections: { post, history, post_system },
  } = sections

  const prefill = (req.parts.prefill || '').trim()

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

  const map: { [pos: number]: string } = {}
  if (req.indexes) {
    for (const [id, pos] of Object.entries(req.indexes)) {
      map[pos] = id
    }
  }

  for (let i = 0; i < history.length; i++) {
    const isPreHistory = offset !== 0 && i === 0
    const line = history[i]
    const original = req.lines[i + offset]
    const role = isPreHistory ? 'user' : original?.startsWith(sender) ? 'user' : 'assistant'

    const id = map[history.length - i - offset - 1]
    const attachments = getAttachments(req, id)

    if (role === 'user' && attachments?.length) {
      req.hasAttachments = true
      messages.push({
        role,
        content: [{ type: 'text', content: line.trim(), text: line.trim() }, ...attachments],
      })
    } else {
      messages.push({ role, content: line.trim() })
    }

    // lastRole = role
  }
  const lastUserIndex = findLast(messages, (m) => m.role === 'user')
  const unused = Object.values(req.attachments || {}).flat()

  if (req.imageData) {
    unused.push({ type: 'image', image: req.imageData })
  }

  if (unused.length && lastUserIndex > 0) {
    req.hasAttachments = true
    const msg = messages[lastUserIndex]
    if (!Array.isArray(msg.content)) {
      msg.content = [{ type: 'text', content: msg.content, text: msg.content }]
    }

    for (const image of unused) {
      msg.content.push({ type: 'image_url', image_url: { url: image.image } })
    }
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

  messages.push({ role: 'assistant', content: `${postContent}${prefill}` })

  return { messages, assembled }
}

function getAttachments(req: GenerateRequestV2, id: string | undefined) {
  if (!id || !req.attachments || !req.indexes) return

  const list = req.attachments[id]
  if (!list?.length) return

  delete req.attachments[id]
  // Remove from the list so we can track which images we've attached

  const messages: any[] = []
  for (const item of list) {
    if (item.type !== 'image') continue
    messages.push({ type: 'image_url', image_url: { url: item.image } })
  }

  if (messages.length) return messages
  return
}

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
export function remapMessages(
  messages: Array<{ role: string; content: any }>,
  maps: { image?: (image: string) => any; text?: (text: string) => any }
) {
  if (!messages) return messages

  for (const msg of messages) {
    if (!Array.isArray(msg.content)) {
      continue
    }

    for (let i = 0; i < msg.content.length; i++) {
      const item = msg.content[i]
      if (item.type === 'text') {
        item[i] = maps.text?.(item) || item
        continue
      }

      if (item.image_url?.url) continue
      item[i] = maps.image?.(item.image_url.url) || item
      continue
    }
  }

  return messages
}

/**
 * @destructive
 * mutates the messages list: adds the image data (base64) to the last user message
 */
export function remapImageContent(
  messages: Array<{ role: string; content: any }>,
  block: (image: string) => any
) {
  if (!messages) return messages

  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue

    for (let i = 0; i < msg.content.length; i++) {
      const item = msg.content[i]
      if (item.type === 'text') continue
      if (item.image_url?.url) continue
      item[i] = block(item.image_url.url)
    }
  }

  return messages
}

export function validateChatMessages(messages: CompletionItem[]) {
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

/**
 * Currently unused, intended to work with awful inflexible jinja templates.
 * E.g. Official Mistral API and default jinja templates in Huggingface repos
 */
export function ensureMessagesAlternate(
  messages: CompletionItem[],
  opts?: { userFirst?: boolean; userLast?: boolean }
): CompletionItem[] {
  if (!messages.length) return messages

  if (opts?.userLast) {
    const last = messages.slice(-1)[0]
    if (last.role === 'assistant') {
      last.role = 'user'
    }
  }

  const merges: Array<CompletionItem[]> = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const previous = merges.slice(-1)[0]
    const mergeMsg = previous?.[0]

    if (!previous || !mergeMsg) {
      merges.push([msg])
      continue
    }

    // All system messages must go to the top in bad templates
    if (msg.role === 'system') {
      const first = merges[0]
      // Case 1. First merge isn't a system role - Move this message to the top
      if (!first || first[0].role !== 'system') {
        merges.unshift([msg])
        continue
      }

      // Case 2. First merge is a system role, add it to the top merge
      first.push(msg)
      continue
    }

    // Same role as last merge, add it to 'current merge'
    if (mergeMsg.role === msg.role) {
      previous.push(msg)
      continue
    }

    // Differnt role to last merge, create a new merge
    merges.push([msg])
  }

  const processed: CompletionItem[] = merges.map((merge) => {
    const first = merge[0]
    return { role: first.role, content: mergeCompletionItems(merge) }
  })

  // We do this after merging
  if (opts?.userFirst) {
    const first = processed[0]
    const second = processed[1]

    // Case 1. No system message, but starts with assistant
    if (first.role === 'assistant') {
      processed.unshift({ role: 'user', content: '...' })
    }
    // Case 2. System message, but first message is assistant
    else if (first.role === 'system' && second?.role !== 'user') {
      processed.splice(1, 0, { role: 'user', content: '...' })
    }
  }

  // const [first, second, ...rest] = messages
  // if (first.role === 'user') return messages

  // if (first.role === 'assistant') {
  //   messages.unshift({ role: 'user', content: '' })
  //   return messages
  // }

  // if (first.role === 'system') {
  //   if (!second) {
  //     messages.push({ role: 'user', content: '...' })
  //     return messages
  //   }

  //   if (second.role === 'user') return messages

  //   const next: CompletionItem[] = [first, { role: 'user', content: '' }, second, ...rest]
  //   return next
  // }

  return processed
}

function mergeCompletionItems(items: CompletionItem[]) {
  const contents: string[] = []

  for (const item of items) {
    contents.push(item.content)
  }

  return contents.join('\n\n')
}
