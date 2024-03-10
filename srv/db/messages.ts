import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'
import { now } from './util'
import { getChatBranchIds } from '/common/chat'
import { store } from '.'
import { config } from '../config'

let PAGE_SIZE = config.limits.msgPageSize
if (isNaN(PAGE_SIZE) || PAGE_SIZE < 20) {
  PAGE_SIZE = 100
}

export type NewMessage = {
  _id?: string
  chatId: string
  message: string
  characterId?: string
  senderId?: string
  adapter?: string
  handle?: string
  ooc: boolean
  imagePrompt?: string
  actions?: AppSchema.ChatMessage['actions']
  meta?: any
  event: AppSchema.ScenarioEventType | undefined
  retries?: string[]
}

export type ImportedMessage = NewMessage & { createdAt: string }

export async function createChatMessage(creating: NewMessage, ephemeral?: boolean) {
  const {
    chatId,
    message,
    characterId,
    senderId,
    adapter,
    ooc,
    imagePrompt,
    actions,
    meta,
    event,
    retries,
  } = creating
  const doc: AppSchema.ChatMessage = {
    _id: creating._id || v4(),
    kind: 'chat-message',
    chatId,
    characterId,
    userId: senderId,
    msg: message,
    retries: retries || [],
    adapter,
    actions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ooc,
    meta,
    event,
  }

  if (imagePrompt) {
    doc.imagePrompt = imagePrompt
  }

  if (!ephemeral) await db('chat-message').insertOne(doc)
  return doc
}

export async function importMessages(userId: string, messages: NewMessage[]) {
  const start = Date.now()
  const docs: AppSchema.ChatMessage[] = messages.map((msg, i) => ({
    _id: v4(),
    kind: 'chat-message',
    rating: 'none',
    chatId: msg.chatId,
    characterId: msg.characterId,
    /**
     * We will use this soon to retain the original handles.
     * This needs further consideration for how it'll be handled in the front-end
     * and how ancestors of this chat will retain this information when subsequent exports occur.
     */
    // userId: msg.senderId === 'anon' ? userId : msg.senderId,
    // handle: msg.handle ? { name: msg.handle, userId: msg.senderId } : undefined,
    handle: msg.handle || undefined,
    userId: msg.senderId ? msg.senderId : undefined,
    msg: msg.message,
    adapter: msg.adapter,
    createdAt: new Date(start + i).toISOString(),
    updatedAt: new Date(start + i).toISOString(),
    retries: [],
  }))

  await db('chat-message').insertMany(docs)
  return docs
}

export async function getMessage(messageId: string) {
  const msg = await db('chat-message').findOne({ _id: messageId, kind: 'chat-message' })
  return msg
}

export async function deleteMessages(messageIds: string[]) {
  await db('chat-message').deleteMany({ _id: { $in: messageIds } })
}

export async function editMessage(
  id: string,
  update: Partial<
    Pick<
      AppSchema.ChatMessage,
      'msg' | 'actions' | 'adapter' | 'meta' | 'state' | 'extras' | 'retries'
    >
  >
) {
  const edit: any = { ...update, updatedAt: now() }

  await db('chat-message').updateOne({ _id: id }, { $set: edit })

  const msg = await getMessage(id)
  return msg
}

export async function getMessages(chatId: string, before?: string) {
  // The initial fetch will retrieve PAGE_SIZE messages.
  // This is to ensure that users have sufficient messages in their application state to build prompts with enough context.
  let pageSize = PAGE_SIZE
  if (!before) {
    before = now()
  }

  const docs = await db('chat-message')
    .find({
      kind: 'chat-message',
      chatId,
      $and: [{ createdAt: { $lt: before } }, { createdAt: { $ne: before } }],
    })
    .sort({ createdAt: -1 })
    .limit(pageSize + 1)
    .toArray()

  if (!docs.length) return []

  docs.reverse()

  if (docs.length < pageSize + 1) {
    docs[0].first = true
    return docs
  }

  return docs.slice(1)
}

export async function getChatMessages(chat: AppSchema.Chat) {
  if (!chat.treeLeafId) return getMessages(chat._id)
  const tree = await store.chats.getChatTree(chat._id)
  if (!tree) return getMessages(chat._id)

  return getChatTreeMessages(tree, chat.treeLeafId)
}

export async function getChatTreeMessages(tree: AppSchema.ChatTree, leafId: string) {
  const ids = getChatBranchIds(tree, leafId)
  const docs = await db('chat-message')
    .find({ kind: 'chat-message', chatId: tree.chatId, _id: { $in: ids } })
    .sort({ createdAt: 1 })
    .toArray()

  return docs
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
