import { v4 } from 'uuid'
import { logger } from '../logger'
import { getCharacter } from './characters'
import { db } from './client'
import { AppSchema } from './schema'
import { now } from './util'

const chats = db('chat')
const msgs = db('chat-message')

export async function getMessages(chatId: string) {
  const { docs } = await msgs.find({
    selector: {
      chatId,
    },
  })
  const sorted = docs.sort((l, r) =>
    l.updatedAt > r.updatedAt ? -1 : l.updatedAt === r.updatedAt ? 0 : 1
  )
  return { messages: sorted }
}

export async function list() {
  const { docs } = await chats.find({
    selector: {
      kind: 'chat',
    },
  })

  return docs
}

export async function getChat(id: string) {
  const chat = await chats.get(id)
  return chat
}

export async function listByCharacter(characterId: string) {
  const { docs } = await chats.find({
    selector: {
      kind: 'chat',
      characterId,
    },
  })

  return docs
}

export async function update(id: string, name: string) {
  const prev = await chats.get(id)

  await chats.put({
    ...prev,
    name,
    updatedAt: now(),
  })

  return chats.get(id)
}

export async function create(
  characterId: string,
  props: Pick<AppSchema.Chat, 'name' | 'greeting' | 'scenario' | 'sampleChat'>
) {
  const id = `${v4()}`
  const char = await getCharacter(characterId)
  const doc: AppSchema.Chat = {
    _id: id,
    kind: 'chat',
    characterId,
    name: props.name,
    greeting: props.greeting,
    sampleChat: props.greeting,
    scenario: props.scenario,
    overrides: char.persona,
    createdAt: now(),
    updatedAt: now(),
    messageCount: 0,
  }

  const msg: AppSchema.ChatMessage = {
    kind: 'chat-message',
    _id: v4(),
    chatId: id,
    msg: props.greeting,
    characterId: char._id,
    createdAt: now(),
    updatedAt: now(),
  }

  await chats.put(doc)
  await msgs.put(msg)
  return doc
}

export async function deleteChat(chatId: string) {
  const doc = await chats.get(chatId)
  const res = await chats.remove(doc)

  if (!res.ok) {
    throw new Error(`Failed to delete document`)
  }
}

export async function deleteAllChats(characterId?: string) {
  const selector: any = { kind: 'chat' }
  if (characterId) {
    selector.characterId = characterId
  }

  const { docs } = await chats.find({
    selector,
  })

  logger.info({ docs }, 'Deleting')
  const results = await Promise.all(docs.map((doc) => chats.remove(doc)))
  logger.info({ results }, 'Results')
}
