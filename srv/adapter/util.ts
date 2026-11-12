import { CompletionItem } from './type'
import { PresetConnection } from '/common/providers'

export function adjustMessageFormatting(conn: PresetConnection, messages: CompletionItem[]) {
  if (conn.provider?.subFormat !== 'mistral' && conn.provider?.provider !== 'known-mistral')
    return messages

  const next: any[] = []

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      next.push(msg)
      continue
    }

    if (!Array.isArray(msg.content)) {
      next.push(msg)
      continue
    }

    const content: any[] = []
    for (const item of msg.content as any[]) {
      if (!item.type) {
        content.push(item)
        continue
      }

      if (item.type !== 'image_url') {
        content.push(item)
        continue
      }

      content.push({ type: 'image_url', image_url: item.image_url?.url })
      continue
    }

    next.push({ ...msg, content })
  }

  return next
}

export const LLM_DEBUG =
  typeof window !== 'undefined'
    ? false
    : typeof process !== 'undefined'
    ? process.env.LOG_LEVEL === 'debug' && !!process.env.LOG_CHUNKS
    : false
