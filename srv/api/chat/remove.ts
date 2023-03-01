import { assertValid } from 'frisker'
import { store } from '../../db'
import { errors, handle } from '../wrap'
import { publishMany } from '../ws/handle'

export const deleteMessages = handle(async ({ body, params, userId }) => {
  const chatId = params.id
  assertValid({ ids: ['string'] }, body)

  const chat = await store.chats.getChat(chatId)
  if (!chat) {
    throw errors.NotFound
  }

  if (chat?.userId !== userId) {
    throw errors.Forbidden
  }

  await store.chats.deleteMessages(body.ids)
  publishMany(chat.memberIds.concat(chat.userId), { type: 'messages-deleted', ids: body.ids })
  return { success: true }
})
