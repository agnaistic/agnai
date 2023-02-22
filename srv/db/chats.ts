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
  const chat = await chats.findOne({ _id: id })
  return chat
}

export async function listByCharacter(characterId: string) {
  const docs = await chats.find({
    kind: 'chat',
    characterId,
  })

  return docs
}

export async function update(id: string, name: string) {
  await chats.updateOne({ _id: id }, { $set: { name, updatedAt: now() } })
  return getChat(id)
}

export async function create(
  characterId: string,
  props: Pick<AppSchema.Chat, 'name' | 'greeting' | 'scenario' | 'sampleChat'>
) {
  const id = `${v4()}`
  const char = await getCharacter(characterId)
  if (!char) {
    throw new Error(`Unable to create chat: Character not found`)
  }

  const doc: AppSchema.Chat = {
    _id: id,
    kind: 'chat',
    characterId,
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

export async function createChatMessage(chatId: string, message: string, characterId?: string) {
  const doc: AppSchema.ChatMessage = {
    _id: v4(),
    kind: 'chat-message',
    rating: 'none',
    characterId,
    chatId,
    msg: message,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await msgs.insertOne(doc)
  return doc
}

export async function editMessage(id: string, content: string) {
  const doc = await msgs.update(
    { _id: id },
    { $set: { msg: content, updatedAt: now() } },
    { returnUpdatedDocs: true }
  )

  return doc
}

export async function deleteMessages(messageIds: string[]) {
  await chats.remove({ _id: { $in: messageIds } }, { multi: true })
}

export async function deleteChat(chatId: string) {
  await chats.remove({ _id: chatId }, {})
  await msgs.remove({ kind: 'chat-message', chatId }, { multi: true })
}

export async function deleteAllChats(characterId?: string) {
  const chatQuery: any = { kind: 'chat' }

  if (characterId) {
    chatQuery.characterId = characterId
  }

  const chatIds = await chats.find(chatQuery).then((chats) => chats.map((ch) => ch._id))

  const chatsDeleted = await chats.remove(chatQuery, { multi: true })
  logger.info({ deleted: chatsDeleted }, 'Deleting')

  const msgsDeleted = msgs.remove({ chatId: { $in: chatIds } }, { multi: true })
  logger.info({ deleted: msgsDeleted }, 'Messages deleted')
}
