import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from './schema'
import { now } from './util'

const PAGE_SIZE = 50

export type NewMessage = {
  chatId: string
  message: string
  characterId?: string
  senderId?: string
  adapter?: string
}

export async function createChatMessage(
  { chatId, message, characterId, senderId, adapter }: NewMessage,
  ephemeral?: boolean
) {
  const doc: AppSchema.ChatMessage = {
    _id: v4(),
    kind: 'chat-message',
    rating: 'none',
    chatId,
    characterId,
    userId: senderId,
    msg: message,
    adapter,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (!ephemeral) await db('chat-message').insertOne(doc)
  return doc
}

export async function getMessage(messageId: string) {
  const msg = await db('chat-message').findOne({ _id: messageId, kind: 'chat-message' })
  return msg
}

export async function deleteMessages(messageIds: string[]) {
  await db('chat-message').deleteMany({ _id: { $in: messageIds } })
}

export async function editMessage(id: string, content: string, adapter?: string) {
  const edit: any = { msg: content, updatedAt: now() }
  if (adapter) {
    edit.adapter = adapter
  }

  await db('chat-message').updateOne({ _id: id }, { $set: edit })

  const msg = await getMessage(id)
  return msg
}

export async function getMessages(chatId: string, before = now()) {
  const docs = await db('chat-message')
    .find({
      kind: 'chat-message',
      chatId,
      $and: [{ createdAt: { $lt: before } }, { createdAt: { $ne: before } }],
    })
    .sort({ createdAt: -1 })
    .limit(PAGE_SIZE + 1)
    .toArray()

  if (!docs.length) return []

  docs.reverse()

  if (docs.length < PAGE_SIZE + 1) {
    docs[0].first = true
    return docs
  }

  return docs.slice(1)
}

/**
 *
 * @param chatId
 * @param before Date ISO string
 */
export async function getRecentMessages(chatId: string, before?: string) {
  const query: any = { kind: 'chat-message', chatId }
  if (before) {
    query.createdAt = { $lt: before }
  }

  const messages = await db('chat-message').find(query).sort({ createdAt: -1 }).limit(50).toArray()
  return messages
}
