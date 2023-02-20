import { v4 } from 'uuid'
import { getCharacter } from './characters'
import { db } from './client'
import { AppSchema } from './schema'
import { now } from './util'

const chats = db('chat')
const msgs = db('chat-message')

export async function getMessages(chatId: string, opts?: { limit: number; prior: string }) {
  const paging = opts ? { updatedAt: { $lt: opts.prior } } : {}
  const { docs } = await msgs.find({
    selector: {
      chatId,
      ...paging,
    },
    sort: [{ updatedAt: 'desc' }],
    limit: opts?.limit,
  })
  return { messages: docs }
}

export async function list() {
  const { docs } = await chats.find({
    selector: {
      kind: 'chat',
    },
  })

  return docs
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
  const id = `chat-${v4()}`
  const char = await getCharacter(characterId)
  await chats.put({
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
  })

  return chats.get(id)
}
