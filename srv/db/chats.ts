import { v4 } from 'uuid'
import { getCharacter } from './characters'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'
import { now } from './util'
import { StatusError, errors } from '../api/wrap'

export async function getChatOnly(id: string) {
  const chat = await db('chat').findOne({ _id: id })
  return chat
}

export async function getChat(id: string) {
  const chat = await db('chat').findOne({ _id: id })
  if (!chat) return

  const charIds = Object.keys(chat.characters || {})
  const characters = await db('character')
    .find({ _id: { $in: charIds.concat(chat.characterId) } })
    .toArray()

  return { chat, characters }
}

export async function listByCharacter(userId: string, characterId: string) {
  const docs = await db('chat').find({ characterId, userId }).sort({ updatedAt: -1 }).toArray()

  return docs
}

export async function getMessageAndChat(msgId: string) {
  const msg = await db('chat-message').findOne({ _id: msgId })
  if (!msg) return

  const chat = await getChatOnly(msg.chatId)
  return { msg, chat }
}

export async function update(id: string, props: PartialUpdate<AppSchema.Chat>) {
  await db('chat').updateOne({ _id: id }, { $set: { ...props, updatedAt: now() } as any })
  return getChatOnly(id)
}

export async function create(
  characterId: string,
  props: Pick<
    AppSchema.Chat,
    | 'name'
    | 'greeting'
    | 'scenario'
    | 'scenarioIds'
    | 'sampleChat'
    | 'userId'
    | 'overrides'
    | 'genPreset'
    | 'mode'
  >
) {
  const id = `${v4()}`
  const char = await getCharacter(props.userId, characterId)
  if (!char) {
    throw new StatusError(`Character not found (${characterId.slice(0, 8)})`, 400)
  }

  const doc: AppSchema.Chat = {
    _id: id,
    kind: 'chat',
    mode: props.mode,
    characterId,
    userId: props.userId,
    memberIds: [],
    name: props.name,
    greeting: props.greeting,
    sampleChat: props.sampleChat,
    scenario: props.scenario,
    overrides: props.overrides,
    scenarioIds: props.scenarioIds,
    createdAt: now(),
    updatedAt: now(),
    genPreset: props.genPreset,
    messageCount: props.greeting ? 1 : 0,
    tempCharacters: {},
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
  await db('chat').deleteMany({ _id: chatId }, {})
  await db('chat-message').deleteMany({ chatId })
  await db('chat-invite').deleteMany({ chatId })
  await db('chat-member').deleteMany({ chatId })
}

export async function deleteAllChats(characterId?: string) {
  const chatQuery: any = {}

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
          characters: 1,
          adapter: 1,
          greeting: 1,
          scenario: 1,
          scenarioIds: 1,
          sampleChat: 1,
          overrides: 1,
          createdAt: 1,
          updatedAt: 1,
          genPreset: 1,
          genSettings: 1,
          // tempCharacters: 1,
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

export async function setChatCharacter(chatId: string, charId: string, state: boolean) {
  await db('chat').updateOne(
    { _id: chatId },
    { $set: { updatedAt: now(), [`characters.${charId}`]: state } }
  )
}

export async function restartChat(userId: string, chatId: string) {
  const chat = await getChatOnly(chatId)
  if (!chat) throw errors.NotFound

  if (chat.userId !== userId) throw errors.Forbidden

  await db('chat-message').deleteMany({ chatId })
  const char = chat.characterId ? await db('character').findOne({ _id: chat.characterId }) : null
  const greeting = char?.greeting

  if (char && greeting) {
    await db('chat-message').insertOne({
      _id: v4(),
      kind: 'chat-message',
      chatId,
      msg: greeting,
      characterId: char._id,
      createdAt: now(),
      updatedAt: now(),
    })
  }
}

export async function createChatTree(chat: AppSchema.Chat) {
  if (chat.tree) return chat

  const messages = (await db('chat-message')
    .find({ chatId: chat._id })
    .project({ _id: 1, createdAt: 1 })
    .sort({ createdAt: 'asc' })
    .toArray()) as Array<{ _id: string; createdAt: string }>

  const tree: AppSchema.Chat['tree'] = {}
  let last: string = ''

  for (const msg of messages) {
    if (last) {
      tree[last].children[msg._id] = 1
    }
    tree[msg._id] = { parent: last, children: {} }
    last = msg._id
  }

  chat.tree = tree
  await db('chat').updateOne({ _id: chat._id }, { $set: { tree } })
  return tree
}

export async function assignMessageParent(opts: {
  chatId: string
  tree: AppSchema.Chat['tree']
  parentId: string
  messageId: string
}) {
  const { tree, parentId, messageId } = opts
  if (!tree || !tree[parentId]) return tree

  tree[parentId].children[messageId] = 1

  await db('chat').updateOne(
    { _id: opts.chatId },
    { $set: { [`tree.${parentId}.children.${messageId}`]: 1 } }
  )
  return tree
}
