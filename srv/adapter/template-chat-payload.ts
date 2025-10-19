import { AppLog } from '../middleware'

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
        msg.content[i] = maps.text?.(item.text) || item
        continue
      }

      if (!item.image_url?.url) continue
      msg.content[i] = maps.image?.(item.image_url.url) || item
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
      msg.content[i] = block(item.image_url.url)
    }
  }

  return messages
}

export function logPayload(logger: AppLog, payload: any) {
  if (!payload.messages) {
    logger.debug({ ...payload, prompt: null }, 'Payload')
    return
  }

  logger.debug({ ...payload, messages: null }, 'Payload')
}
