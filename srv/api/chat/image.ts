import { createImageStream } from '../../adapter/generate'
import { handle } from '../wrap'

/**
 * Storage?
 */

export const createImage = handle(async ({ body, params, userId }) => {
  const stream = await createImageStream({ chatId: params.id, senderId: userId! })
  return { stream }
})
