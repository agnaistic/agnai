import { v4 } from 'uuid'
import { getCharacter } from './characters'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'
import { now } from './util'
import { StatusError, errors } from '../api/wrap'
import { parseTemplate } from '/common/template-parser'
import { config } from '../config'

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
  await db('chat').updateOne(
    { _id: id },
    { $set: { ...props, updatedAt: props.updatedAt || now() } as any }
  )
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
    | 'imageSource'
    | 'treeLeafId'
  >,
  profile: AppSchema.Profile,
  impersonating?: AppSchema.Character
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
    imageSource: props.imageSource,
    treeLeafId: props.treeLeafId,
  }

  await db('chat').insertOne(doc)

  if (props.greeting) {
    const { parsed } = await parseTemplate(props.greeting, {
      chat: doc,
      char,
      impersonate: impersonating,
      sender: profile,
      jsonValues: {},
    })
    const msg: AppSchema.ChatMessage = {
      kind: 'chat-message',
      _id: v4(),
      chatId: id,
      msg: parsed,
      characterId: char._id,
      createdAt: now(),
      updatedAt: now(),
      retries: char.alternateGreetings || [],
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

  if (config.ui.chatCounts) {
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
        {
          $lookup: {
            from: 'chat-message',
            localField: '_id',
            foreignField: 'chatId',
            as: 'chatMessages',
          },
        },
        {
          $addFields: {
            messageCount: { $size: '$chatMessages' },
          },
        },
        { $unwind: { path: '$character' } },
        {
          $project: {
            _id: 1,
            userId: 1,
            name: 1,
            characterId: 1,
            characters: 1,
            createdAt: 1,
            updatedAt: 1,
            messageCount: 1,
            genPreset: 1,
            'character.name': 1,
          },
        },
      ])
      .toArray()

    return list
  }

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
          _id: 1,
          userId: 1,
          name: 1,
          characterId: 1,
          characters: 1,
          createdAt: 1,
          updatedAt: 1,
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

export async function restartChat(
  userId: string,
  chatId: string,
  profile: AppSchema.Profile,
  impersonate?: AppSchema.Character
) {
  const chat = await getChatOnly(chatId)
  if (!chat) throw errors.NotFound

  if (chat.userId !== userId) throw errors.Forbidden

  await db('chat-message').deleteMany({ chatId })
  const char = chat.characterId ? await db('character').findOne({ _id: chat.characterId }) : null
  const greeting = char?.greeting

  if (!char || !greeting) return

  const { parsed } = await parseTemplate(greeting, {
    char,
    chat,
    sender: profile,
    impersonate,
    jsonValues: {},
  })

  await db('chat-message').insertOne({
    _id: v4(),
    kind: 'chat-message',
    chatId,
    msg: parsed,
    characterId: char._id,
    createdAt: now(),
    updatedAt: now(),
    retries: char.alternateGreetings || [],
  })
}
