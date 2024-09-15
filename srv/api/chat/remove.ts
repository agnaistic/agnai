import { assertValid } from '/common/valid'
import { store } from '../../db'
import { errors, handle } from '../wrap'
import { sendMany } from '../ws'

export const deleteMessages = handle(async ({ body, params, userId }) => {
  const chatId = params.id
  assertValid({ ids: ['string'], leafId: 'string?', parents: 'any?' }, body)

  const chat = await store.chats.getChatOnly(chatId)
  if (!chat) {
    throw errors.NotFound
  }

  if (chat?.userId !== userId) {
    throw errors.Forbidden
  }

  await store.msgs.deleteMessages(body.ids)

  if (body.leafId) {
    await store.chats.update(chatId, { treeLeafId: body.leafId })
  }

  if (body.parents) {
    for (const [msgId, parent] of Object.entries(body.parents)) {
      if (!parent) continue
      if (typeof parent !== 'string') continue
      await store.msgs.editChatMessage(msgId, chatId, { parent })
    }

    sendMany(chat.memberIds.concat(chat.userId), {
      type: 'message-parents',
      chatId,
      parents: body.parents,
    })
  }

  sendMany(chat.memberIds.concat(chat.userId), { type: 'messages-deleted', ids: body.ids })
  return { success: true }
})

export const deleteChat = handle(async ({ params, userId }) => {
  const chat = await store.chats.getChatOnly(params.id)
  if (!chat) {
    throw errors.NotFound
  }

  // Allow users to remove themselves from the chat using 'chat deletion'
  if (chat.userId !== userId && chat.memberIds.includes(userId)) {
    sendMany([userId, ...chat.memberIds, chat.userId], {
      type: 'member-removed',
      chatId: params.id,
      memberId: userId,
    })
    await store.invites.removeMember(params.id, userId, userId)
    return
  }

  if (chat.userId !== userId) {
    throw errors.Forbidden
  }

  await store.chats.deleteChat(params.id)
  sendMany(chat.memberIds.concat(chat.userId), { type: 'chat-deleted', chatId: params.id })
  return { success: true }
})
