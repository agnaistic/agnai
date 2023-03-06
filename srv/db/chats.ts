import { v4 } from 'uuid'
import { logger } from '../logger'
import { getCharacter } from './characters'
import { db } from './client'
import { AppSchema } from './schema'
import { now } from './util'

export async function getMessages(chatId: string) {
  const docs = await db('chat-message')
    .find({ kind: 'chat-message', chatId })
    .sort({ createdAt: 1 })
    .toArray()
  return docs
}

export async function list() {
  const docs = await db('chat').find({ kind: 'chat' }).toArray()
  return docs
}

export async function getChat(id: string) {
  const chat = await db('chat').findOne({ _id: id, kind: 'chat' })
  return chat
}

export async function listByCharacter(characterId: string) {
  const docs = await db('chat')
    .find({ kind: 'chat', characterId })
    .sort({ updatedAt: -1 })
    .toArray()

  return docs
}

export async function getMessageAndChat(msgId: string) {
  const msg = await db('chat-message').findOne({ _id: msgId, kind: 'chat-message' })
  if (!msg) return

  const chat = await getChat(msg.chatId)
  return { msg, chat }
}

export async function update(id: string, props: Partial<AppSchema.Chat>) {
  await db('chat').updateOne({ _id: id }, { $set: { ...props, updatedAt: now() } })
  return getChat(id)
}

export async function updateGenPreset(chatId: string, preset: string) {
  await db('chat').updateOne(
    { _id: chatId },
    { $set: { genSettings: undefined, genPreset: preset } }
  )
}

export async function updateGenSetting(chatId: string, props: AppSchema.Chat['genSettings']) {
  await db('chat').updateOne({ _id: chatId }, { $set: { genSettings: props, genPreset: '' } })
}

export async function create(
  characterId: string,
  props: Pick<
    AppSchema.Chat,
    'name' | 'greeting' | 'scenario' | 'sampleChat' | 'userId' | 'overrides'
  >
) {
  const id = `${v4()}`
  const char = await getCharacter(props.userId, characterId)
  if (!char) {
    throw new Error(`Unable to create chat: Character not found`)
  }

  const doc: AppSchema.Chat = {
    _id: id,
    kind: 'chat',
    characterId,
    userId: props.userId,
    memberIds: [],
    name: props.name,
    greeting: props.greeting,
    sampleChat: props.sampleChat,
    scenario: props.scenario,
    overrides: props.overrides || char.persona,
    createdAt: now(),
    updatedAt: now(),
    messageCount: props.greeting ? 1 : 0,
  }

  await db('chat').insertOne(doc)

  if (props.greeting) {
    const msg: AppSchema.ChatMessage = {
      kind: 'chat-message',
      _id: v4(),
      chatId: id,
      msg: props.greeting,
      characterId: char._id,
      createdAt: now(),
      updatedAt: now(),
    }
    await db('chat-message').insertOne(msg)
  }
  return doc
}

export type NewMessage = {
  chatId: string
  message: string
  characterId?: string
  senderId?: string
}

export async function createChatMessage(
  { chatId, message, characterId, senderId }: NewMessage,
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (!ephemeral) await db('chat-message').insertOne(doc)
  return doc
}

export async function editMessage(id: string, content: string) {
  const doc = await db('chat-message').updateOne(
    { _id: id },
    { $set: { msg: content, updatedAt: now() } }
  )

  const msg = await getMessage(id)
  return msg
}

export async function getMessage(messageId: string) {
  const msg = await db('chat-message').findOne({ _id: messageId, kind: 'chat-message' })
  return msg
}

export async function deleteMessages(messageIds: string[]) {
  await db('chat-message').deleteMany({ _id: { $in: messageIds } })
}

export async function deleteChat(chatId: string) {
  await db('chat').deleteMany({ _id: chatId, kind: 'chat' }, {})
  await db('chat-message').deleteMany({ chatId })
  await db('chat-invite').deleteMany({ chatId })
  await db('chat-member').deleteMany({ chatId })
}

export async function deleteAllChats(characterId?: string) {
  const chatQuery: any = { kind: 'chat' }

  if (characterId) {
    chatQuery.characterId = characterId
  }

  const chatIds = await db('chat')
    .find(chatQuery)
    .toArray()
    .then((chats) => chats.map((ch) => ch._id))

  const chatsDeleted = await db('chat').deleteMany(chatQuery)
  logger.info({ deleted: chatsDeleted }, 'Deleting')

  const msgsDeleted = db('chat-message').deleteMany({ chatId: { $in: chatIds } })
  logger.info({ deleted: msgsDeleted }, 'Messages deleted')
}

export function canViewChat(senderId: string, chat: AppSchema.Chat) {
  return chat.userId === senderId || chat.memberIds.includes(senderId)
}

export async function getAllChats(userId: string) {
  const list = await db('chat')
    .find({
      $or: [
        { kind: 'chat', userId },
        { kind: 'chat', memberIds: userId },
      ],
    })
    .sort({ updatedAt: -1 })
    .toArray()

  return list
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
