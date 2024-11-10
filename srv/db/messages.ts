import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'
import { now } from './util'
import { WithId } from 'mongodb'

// let PAGE_SIZE = config.limits.msgPageSize
// if (isNaN(PAGE_SIZE) || PAGE_SIZE < 20) {
//   PAGE_SIZE = 0
// }

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
  parent?: string
  json?: AppSchema.ChatMessage['json']
  values?: any
  name: string | undefined
}

export type ImportedMessage = NewMessage & { createdAt: string }

export async function createChatMessage(creating: NewMessage, ephemeral?: boolean) {
  const doc: AppSchema.ChatMessage = {
    _id: creating._id || v4(),
    kind: 'chat-message',
    chatId: creating.chatId,
    characterId: creating.characterId,
    userId: creating.senderId,
    msg: creating.message,
    retries: creating.retries || [],
    adapter: creating.adapter,
    actions: creating.actions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ooc: creating.ooc,
    meta: creating.meta,
    event: creating.event,
    parent: creating.parent,
    json: creating.json,
  }

  if (creating.imagePrompt) {
    doc.imagePrompt = creating.imagePrompt
  }

  if (!ephemeral) await db('chat-message').insertOne(doc)
  return doc
}

export async function importMessages(userId: string, messages: NewMessage[]) {
  const start = Date.now()

  const parents = new Map<string, AppSchema.ChatMessage>()

  const docs: AppSchema.ChatMessage[] = messages.map((msg, i) => {
    const id = v4()

    const mapped = {
      _id: id,
      kind: 'chat-message',
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
      userId: msg.senderId ? userId : undefined,
      parent: msg.parent,
      ooc: msg.ooc,
      json: msg.json,
      values: msg.values,
      msg: msg.message,
      name: msg.name,
      adapter: msg.adapter,
      createdAt: new Date(start + i).toISOString(),
      updatedAt: new Date(start + i).toISOString(),
      retries: [],
    } as AppSchema.ChatMessage

    if (msg.parent) {
      parents.set(msg._id!, mapped)
    }

    return mapped
  })

  for (const msg of docs) {
    if (!msg.parent) continue
    const parent = parents.get(msg.parent)
    msg.parent = parent?._id
  }

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

export async function editChatMessage(
  id: string,
  chatId: string,
  update: Partial<
    Pick<
      AppSchema.ChatMessage,
      'msg' | 'actions' | 'adapter' | 'meta' | 'state' | 'extras' | 'retries' | 'parent' | 'json'
    >
  >
) {
  const edit: any = { ...update, updatedAt: now() }

  await db('chat-message').updateOne({ _id: id, chatId }, { $set: edit })

  const msg = await getMessage(id)
  return msg
}

export async function editMessage(
  id: string,
  update: Partial<
    Pick<
      AppSchema.ChatMessage,
      'msg' | 'actions' | 'adapter' | 'meta' | 'state' | 'extras' | 'retries' | 'parent' | 'json'
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
  let pageSize = 0
  if (!before) {
    before = now()
  }

  const result: Array<WithId<AppSchema.ChatMessage>> = []

  if (pageSize) {
    const docs = await db('chat-message')
      .find({
        kind: 'chat-message',
        chatId,
        $and: [{ createdAt: { $lt: before } }, { createdAt: { $ne: before } }],
      })
      .sort({ createdAt: -1 })
      .limit(pageSize + 1)
      .toArray()
    result.push(...docs)
  } else {
    const docs = await db('chat-message')
      .find({
        kind: 'chat-message',
        chatId,
        $and: [{ createdAt: { $lt: before } }, { createdAt: { $ne: before } }],
      })
      .sort({ createdAt: -1 })
      .toArray()
    result.push(...docs)
  }

  if (!result.length) return []

  result.reverse()

  if (result.length < pageSize + 1) {
    result[0].first = true
    return result
  }

  return pageSize ? result.slice(1) : result
}

export async function getChatMessages(chat: AppSchema.Chat) {
  const messages = await getMessages(chat._id)
  return messages
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
