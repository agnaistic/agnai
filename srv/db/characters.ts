import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'
import { now } from './util'
import { UpdateFilter } from 'mongodb'

export type CharacterUpdate = Partial<
  Pick<
    AppSchema.Character,
    | 'name'
    | 'avatar'
    | 'persona'
    | 'sampleChat'
    | 'greeting'
    | 'scenario'
    | 'description'
    | 'culture'
    | 'tags'
    | 'favorite'
    | 'voice'
    | 'alternateGreetings'
    | 'characterBook'
    | 'extensions'
    | 'systemPrompt'
    | 'postHistoryInstructions'
    | 'insert'
    | 'creator'
    | 'characterVersion'
    | 'appearance'
    | 'sprite'
    | 'visualType'
    | 'voiceDisabled'
    | 'imageSettings'
    | 'json'
    | 'folder'
  >
>

export async function createCharacter(
  userId: string,
  char: Pick<
    AppSchema.Character,
    | 'name'
    | 'appearance'
    | 'avatar'
    | 'persona'
    | 'sampleChat'
    | 'greeting'
    | 'scenario'
    | 'description'
    | 'culture'
    | 'tags'
    | 'favorite'
    | 'voice'
    | 'alternateGreetings'
    | 'characterBook'
    | 'extensions'
    | 'systemPrompt'
    | 'postHistoryInstructions'
    | 'insert'
    | 'creator'
    | 'characterVersion'
    | 'sprite'
    | 'visualType'
    | 'voiceDisabled'
    | 'imageSettings'
    | 'json'
  >
) {
  const newChar: AppSchema.Character = {
    _id: v4(),
    kind: 'character',
    userId,
    createdAt: now(),
    updatedAt: now(),
    ...char,
  }

  await db('character').insertOne(newChar)
  return newChar
}

export async function updateCharacter(id: string, userId: string, char: CharacterUpdate) {
  const edit = { ...char, updatedAt: now() }
  if (edit.avatar === undefined) {
    delete edit.avatar
  }
  await db('character').updateOne({ _id: id, userId }, { $set: edit })
  return getCharacter(userId, id)
}

export async function bulkUpdate(
  userId: string,
  charIds: string[],
  update: { folder?: string; addTag?: string; removeTag?: string }
) {
  const set: UpdateFilter<AppSchema.Character> = {}

  if (update.folder) {
    set.folder = update.folder
  }

  if (update.addTag) {
    set.$push = { tags: update.addTag }
  }

  if (update.removeTag) {
    set.$pull = { tags: update.removeTag }
  }

  const result = await db('character').updateMany(
    { where: { userId, _id: { $in: charIds } } },
    { $set: set }
  )

  return result.matchedCount
}

export async function partialUpdateCharacter(id: string, userId: string, char: CharacterUpdate) {
  const edit = { ...char, updatedAt: now() }

  await db('character').updateOne({ _id: id, userId }, { $set: edit })
  return getCharacter(userId, id)
}

export async function getCharacter(
  userId: string,
  id: string
): Promise<AppSchema.Character | undefined> {
  const char = await db('character').findOne({ _id: id, userId })
  return char || undefined
}

export async function getCharacters(userId: string) {
  const list = await db('character')
    .find({ userId })
    .project({
      _id: 1,
      userId: 1,
      name: 1,
      avatar: 1,
      description: 1,
      favorite: 1,
      tags: 1,
      createdAt: 1,
      updatedAt: 1,
      voice: 1,
      voiceDisabled: 1,
      folder: 1,
    })
    .toArray()

  return list
}

export async function deleteCharacter(opts: { charId: string; userId: string }) {
  await db('character').deleteOne({ _id: opts.charId, userId: opts.userId, kind: 'character' }, {})
  const chats = await db('chat').find({ characterId: opts.charId, userId: opts.userId }).toArray()
  await db('chat-message').deleteMany({ chatId: { $in: chats.map((ch) => ch._id) } })
  await db('chat').deleteMany({ characterId: opts.charId, userId: opts.userId })
}

export async function getCharacterList(charIds: string[], userId?: string) {
  const project = {
    _id: 1,
    userId: 1,
    name: 1,
    avatar: 1,
    description: 1,
    favorite: 1,
    tags: 1,
    createdAt: 1,
    updatedAt: 1,
    voice: 1,
    visualType: 1,
    sprite: 1,
    voiceDisabled: 1,
    folder: 1,
  }
  if (userId) {
    const list = await db('character')
      .find({ $or: [{ _id: { $in: charIds } }, { userId }] })
      .project(project)
      .toArray()
    return list
  }

  const list = await db('character')
    .find({ _id: { $in: charIds } })
    .project(project)
    .toArray()
  return list
}
