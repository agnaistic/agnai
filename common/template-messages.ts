import { replaceTags } from './presets/templates'
import { assemblePrompt } from './prompt'
import { CompletionItem } from './requests/openai'
import { AppSchema, TokenCounter } from './types'
import { findLast } from './util'
import { GenerateRequestV2 } from '/srv/adapter/type'

export async function toChatMessages(req: GenerateRequestV2, counter: TokenCounter) {
  const assembled = await assemblePrompt(req, counter, true)

  const { sections } = assembled
  const {
    strictSystem,
    sections: { post, post_system },
  } = sections

  const prefill = (req.parts.prefill || '').trim()

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: any }> = []
  const systemPrompt = strictSystem.join('').trim().replace(/\n\n+/g, '\n\n')
  const postSystem = post_system.join('').trim().replace(/\n\n+/g, '\n\n')

  // Legacy:
  // if (systemPrompt) {
  //   messages.push({
  //     role: 'system',
  //     content: strictSystem.join('').trim().replace(/\n\n+/g, '\n\n'),
  //   })
  // }

  // if (postSystem) {
  //   messages.push({ role: 'user', content: postSystem })
  // }

  if (systemPrompt || postSystem) {
    const joined = [systemPrompt || '', postSystem || ''].filter((m) => !!m.trim()).join('\n\n')
    messages.push({ role: 'system', content: joined.trim().replace(/\n\n+/g, '\n\n') })
  }

  const sender = (req.impersonate?.name || req.sender.handle) + ':'
  // let lastRole = ''

  let unparsedIndex = 0

  for (let i = 0; i < assembled.lines.length; i++) {
    const unparsed = assembled.unparsedLines[unparsedIndex]
    const line = assembled.lines[i]

    const text = replaceTags(line.line, 'None').trim()

    /**
     * The `assembles.lines` can contain history interwoven with inserts.
     * The `unparsedLines` only contains history.
     * We need to track the indexes independently to ensure we get the correct unparsed line
     */
    if (line.type === 'history') {
      unparsedIndex++
    }

    const lineRole = line.role === 'user' ? 'user' : 'assistant'

    const role =
      line.type !== 'history'
        ? 'user'
        : req.history
        ? lineRole
        : (unparsed || text || '').startsWith(sender)
        ? 'user'
        : 'assistant'

    const id = line.type === 'history' ? line.id : undefined
    const attachments = getAttachments(req, id)

    if (role === 'user' && attachments?.length) {
      req.hasAttachments = true
      messages.push({
        role: `${role}`,
        content: [{ type: 'text', text }, ...attachments],
        // content: [{ type: 'text', content: text, text }, ...attachments],
      })
    } else {
      messages.push({ role, content: text })
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
      // msg.content = [{ type: 'text', content: `${msg.content}`, text: msg.content }]
      msg.content = [{ type: 'text', text: msg.content }]
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

  const role = req.settings?.postUserRole ? 'user' : 'assistant'
  if (postContent || prefill) {
    messages.push({ role, content: `${postContent}${prefill}` })
  }

  if (req.settings?.skipRoleMerging) {
    return { messages, assembled }
  }

  const mergedMsgs = ensureMessagesAlternate(messages)
  const mergedBlocks = ensureMessagesAlternate(assembled.blocks)
  return {
    messages: mergedMsgs,
    assembled: {
      ...assembled,
      blocks: mergedBlocks,
    },
  }
}

function getAttachments(req: Pick<GenerateRequestV2, 'attachments'>, id: string | undefined) {
  if (!id || !req.attachments) return

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

type OutgoingMsg = { role: string; content: any }

export function validateChatMessages(messages: OutgoingMsg[]) {
  let lastRole = ''
  const next: typeof messages = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (lastRole !== msg.role) {
      lastRole = msg.role
      next.push(msg)
      continue
    }

    const last = next.slice(-1)[0]
    if (!last) continue

    if (!Array.isArray(last.content) && !Array.isArray(msg.content)) {
      next[next.length - 1] = {
        ...last,
        content: `${last.content.trim()}\n\n${msg.content}`,
      }
      continue
    }

    const joined = joinMessages(last, msg)
    next[next.length - 1] = joined
  }

  return next
}

function joinMessages(head: OutgoingMsg, tail: OutgoingMsg) {
  const first = splitMessage(head)
  const second = splitMessage(tail)

  const text = [first.text, second.text].filter((t) => !!t.trim()).join('\n\n')

  return {
    role: second.role,
    // content: [{ type: 'text', text, content: text }, ...first.attachments, ...second.attachments],
    content: [{ type: 'text', text }, ...first.attachments, ...second.attachments],
  }
}

function splitMessage(msg: OutgoingMsg) {
  if (!Array.isArray(msg.content)) {
    return { role: msg.role, text: msg.content, attachments: [] }
  }

  const texts: string[] = []
  const attachments: any[] = []

  for (const part of msg.content) {
    if (part.type === 'text') {
      texts.push(part.text)
      continue
    }

    attachments.push(part)
  }

  return { role: msg.role, text: texts.join('\n\n'), attachments }
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
    return { role: first.role, content: mergeCompletionItems(merge) as any }
  })

  // We do this after merging
  if (opts?.userFirst) {
    const first = processed[0]
    const second = processed[1]

    // Case 1. No system message, but starts with assistant
    if (first.role === 'assistant') {
      processed.unshift({ role: 'user', content: '' })
    }
    // Case 2. System message, but first message is assistant
    else if (first.role === 'system' && second?.role !== 'user') {
      processed.splice(1, 0, { role: 'user', content: '' })
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
  const texts: string[] = []
  const others: any[] = []

  const contents: any[] = []
  for (const item of items) {
    if (Array.isArray(item.content)) {
      contents.push(...item.content)
      continue
    }

    contents.push(item)
  }

  for (const item of contents) {
    if (item.type === 'text') {
      texts.push(item.text)
      continue
    }

    if (typeof item.content === 'string') {
      texts.push(item.content)
      continue
    }

    others.push(item)
  }

  const content = texts.join('\n\n')

  if (!others.length) {
    return content
  }

  const merged = [{ type: 'text', text: content }, ...others]
  return merged
}
