import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from './schema'
import { now } from './util'

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
  >
>

export async function createCharacter(
  userId: string,
  char: Pick<
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
  const clearAvatar = edit.avatar === ''
  if (!edit.avatar) {
    delete edit.avatar
  }
  await db('character').updateOne(
    { _id: id, userId, kind: 'character' },
    { $set: edit, $unset: clearAvatar ? { avatar: 1 } : {} }
  )
  return getCharacter(userId, id)
}

export async function getCharacter(
  userId: string,
  id: string
): Promise<AppSchema.Character | undefined> {
  const char = await db('character').findOne({ kind: 'character', _id: id, userId })
  return char || undefined
}

export async function getCharacters(userId: string) {
  const list = await db('character').find({ kind: 'character', userId }).toArray()
  return list
}

export async function deleteCharacter(opts: { charId: string; userId: string }) {
  await db('character').deleteOne({ _id: opts.charId, userId: opts.userId, kind: 'character' }, {})
  const chats = await db('chat').find({ characterId: opts.charId, userId: opts.userId }).toArray()
  await db('chat-message').deleteMany({ chatId: { $in: chats.map((ch) => ch._id) } })
  await db('chat').deleteMany({ characterId: opts.charId, userId: opts.userId })
}

export async function getCharacterList(charIds: string[]) {
  const list = await db('character')
    .find({ _id: { $in: charIds }, kind: 'character' })
    .toArray()
  return list
}
