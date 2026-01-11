import { assertValid } from '/common/valid'
import { store } from '../../db'
import { errors, handle, StatusError } from '../wrap'
import { sendMany } from '../ws'
import { getDeletionChanges, toQuickGraph } from '/common/chat'
import { db, transact } from '/srv/db/client'

export const deleteMessagesV2 = handle(async ({ body, params, userId }) => {
  const chatId = params.id
  assertValid({ ids: ['string'], leafId: 'string', soft: 'boolean?' }, body)

  const { chat, messages } = await store.chats.getChatGraph(chatId)
  if (!chat) {
    throw errors.NotFound
  }

  if (chat.userId !== userId) {
    throw errors.Forbidden
  }

  const graph = toQuickGraph(messages, body.leafId)
  const edges = getDeletionChanges(graph, body.ids)

  if (!body.soft) {
    await transact(async () => {
      // No parents get updated in a 'tail' delete
      if (edges.nextLeafId !== undefined) {
        await store.chats.update(chatId, { treeLeafId: edges.nextLeafId })
      }

      // We only need to update the parents in a 'middle' delete:
      // target-tail.children[].parent = target-head.parent
      // i.e., the 'parents of the immediate descendants' of the 'tail' of the deletes becomes the parent of the 'head' of the deletes
      if (edges.parents) {
        await db('chat-message').updateMany(
          { _id: { $in: edges.parents.ids } },
          { $set: { parent: edges.parents.parentId } }
        )
      }

      await store.msgs.deleteMessages(body.ids)
    })
  }

  const members = [chat.userId].concat(chat.memberIds || [])
  sendMany(members, { type: 'messages-deleted-v2', updates: edges.updates, deletes: body.ids })

  return edges.updates
})

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

  const members = [chat.userId].concat(chat.memberIds || [])
  await store.msgs.deleteMessages(body.ids)

  const toVerifyIds: string[] = []
  if (body.leafId) toVerifyIds.push(body.leafId)
  if (body.parents) {
    const ids = Object.keys(body.parents)
    toVerifyIds.push(...ids)
  }

  if (toVerifyIds.length) {
    const verify = await store.msgs.checkExistance(toVerifyIds)

    if (verify.missing.length) {
      throw new StatusError(`Some message IDs were invalid. Refresh and try again.`, 400)
    }
  }

  if (body.leafId) {
    await store.chats.update(chatId, { treeLeafId: body.leafId })
  }

  if (body.parents) {
    for (const [msgId, parent] of Object.entries(body.parents)) {
      if (!parent) continue
      if (typeof parent !== 'string') continue
      await store.msgs.editChatMessage(msgId, chatId, { parent })
    }

    sendMany(members, {
      type: 'message-parents',
      chatId,
      parents: body.parents,
    })
  }

  sendMany(members, { type: 'messages-deleted', ids: body.ids })
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
