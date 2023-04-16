// import { createImageStream } from '../../adapter/generate'
import { assertValid } from 'frisker'
import { store } from '../../db'
import { generateImage } from '../../image'
import { handle } from '../wrap'

/**
 * Storage?
 */

export const createImage = handle(async ({ body, userId, socketId, log, params }) => {
  assertValid({ user: 'any?', prompt: 'string', messageId: 'string?' }, body)
  const user = userId ? await store.users.getUser(userId) : body.user

  const guestId = userId ? undefined : socketId
  generateImage(
    { user, prompt: body.prompt, chatId: params.id, messageId: body.messageId },
    log,
    guestId
  )
  return { success: true }
})
