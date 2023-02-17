import { v4 } from 'uuid'
import { db } from './client'

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
    fields: ['name', 'actors', 'createdAt', 'updatedAt'],
    selector: {
      kind: 'chat',
    },
    sort: [{ updatedAt: 'desc' }],
  })

  return docs
}

export async function update(id: string, name: string) {
  const prev = await chats.get(id)

  await chats.put({
    ...prev,
    name,
    updated: now(),
  })

  return chats.get(id)
}

export async function create(characterId: string, name = 'Untitled') {
  const id = `chat-${v4()}`
  await chats.put({
    _id: id,
    kind: 'chat',
    name,
    characterId,
    createdAt: now(),
    updatedAt: now(),
  })

  return chats.get(id)
}

function now() {
  return new Date().toISOString()
}
