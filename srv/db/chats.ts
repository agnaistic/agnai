import { v4 } from 'uuid'
import { logger } from '../logger'
import { getCharacter } from './characters'
import { db } from './client'
import { AppSchema } from './schema'
import { now } from './util'

const chats = db('chat')
const msgs = db('chat-message')

export async function getMessages(chatId: string) {
  const docs = await msgs.find({ chatId }).sort({ createdAt: 1 })
  return docs
}

export async function list() {
  const docs = await chats.find({ kind: 'chat' })
  return docs
}

export async function getChat(id: string) {
  const chat = await chats.findOne({ _id: id, kind: 'chat' })
  return chat
}

export async function listByCharacter(characterId: string) {
  const docs = await chats.find({
    kind: 'chat',
    characterId,
  })

  return docs
}

export async function getMessageAndChat(msgId: string) {
  const msg = await msgs.findOne({ _id: msgId })
  if (!msg) return

  const chat = await getChat(msg.chatId)
  return { msg, chat }
}

export async function update(id: string, props: Partial<AppSchema.Chat>) {
  await chats.updateOne({ _id: id }, { $set: { ...props, updatedAt: now() } })
  return getChat(id)
}

export async function create(
  characterId: string,
  props: Pick<AppSchema.Chat, 'name' | 'greeting' | 'scenario' | 'sampleChat' | 'userId'>
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
    overrides: char.persona,
    createdAt: now(),
    updatedAt: now(),
    messageCount: props.greeting ? 1 : 0,
  }

  await chats.insertOne(doc)

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
    await msgs.insertOne(msg)
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

  if (!ephemeral) await msgs.insertOne(doc)
  return doc
}

export async function editMessage(id: string, content: string) {
  const doc = await msgs.updateOne(
    { _id: id },
    { $set: { msg: content, updatedAt: now() } },
    { returnUpdatedDocs: true }
  )

  return doc
}

export async function deleteMessages(messageIds: string[]) {
  await chats.deleteMany({ _id: { $in: messageIds } }, { multi: true })
}

export async function deleteChat(chatId: string) {
  await chats.deleteMany({ _id: chatId }, {})
  await msgs.deleteMany({ kind: 'chat-message', chatId }, { multi: true })
}

export async function deleteAllChats(characterId?: string) {
  const chatQuery: any = { kind: 'chat' }

  if (characterId) {
    chatQuery.characterId = characterId
  }

  chats.find({ })
  const chatIds = await chats.find(chatQuery).then((chats) => chats.map((ch) => ch._id))

  const chatsDeleted = await chats.remove(chatQuery, { multi: true })
  logger.info({ deleted: chatsDeleted }, 'Deleting')

  const msgsDeleted = msgs.remove({ chatId: { $in: chatIds } }, { multi: true })
  logger.info({ deleted: msgsDeleted }, 'Messages deleted')
}

export function canViewChat(senderId: string, chat: AppSchema.Chat) {
  return chat.userId === senderId || chat.memberIds.includes(senderId)
}
