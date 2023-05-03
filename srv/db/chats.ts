import { v4 } from 'uuid'
import { getCharacter } from './characters'
import { db } from './client'
import { AppSchema } from './schema'
import { now } from './util'

export async function list() {
  const docs = await db('chat').find({ kind: 'chat' }).toArray()
  return docs
}

export async function getChat(id: string) {
  const chat = await db('chat').findOne({ _id: id, kind: 'chat' })
  return chat
}

export async function listByCharacter(userId: string, characterId: string) {
  const docs = await db('chat')
    .find({ kind: 'chat', characterId, userId })
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

export async function create(
  characterId: string,
  props: Pick<
    AppSchema.Chat,
    'name' | 'greeting' | 'scenario' | 'sampleChat' | 'userId' | 'overrides' | 'genPreset'
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
    genPreset: props.genPreset,
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

  await db('chat').deleteMany(chatQuery)
  await db('chat-message').deleteMany({ chatId: { $in: chatIds } })
}

export async function canViewChat(senderId: string, chat: AppSchema.Chat) {
  if (chat.userId === senderId) return true
  const membership = await db('chat-member').findOne({ chatId: chat._id, userId: senderId })
  return !!membership
}

export async function getAllChats(userId: string) {
  const memberships = await db('chat-member').find({ userId }).toArray()

  const list = await db('chat')
    .aggregate([
      {
        $match: {
          $or: [{ userId }, { _id: { $in: memberships.map((mem) => mem.chatId) } }],
        },
      },
      {
        $lookup: {
          from: 'character',
          localField: 'characterId',
          foreignField: '_id',
          as: 'character',
        },
      },
      { $unwind: { path: '$character' } },
      {
        $project: {
          userId: 1,
          memoryId: 1,
          memberIds: 1,
          name: 1,
          characterId: 1,
          adapter: 1,
          greeting: 1,
          scenario: 1,
          sampleChat: 1,
          overrides: 1,
          createdAt: 1,
          updatedAt: 1,
          genPreset: 1,
          genSettings: 1,
          'character.name': 1,
        },
      },
    ])
    .toArray()

  return list
}

export async function getActiveMembers(chatId: string) {
  const members = await db('chat-member')
    .find({ chatId })
    .toArray()
    .then((list) => list.map((member) => member.userId))
  return members
}
