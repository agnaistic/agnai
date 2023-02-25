import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from './schema'
import { now } from './util'

const chars = db('character')

export async function createCharacter(
  userId: string,
  char: Pick<
    AppSchema.Character,
    'name' | 'avatar' | 'persona' | 'sampleChat' | 'greeting' | 'scenario'
  >
) {
  const newChar: AppSchema.Character = {
    _id: v4(),
    kind: 'character',
    adapter: 'default',
    userId,
    createdAt: now(),
    updatedAt: now(),
    ...char,
  }

  await chars.insertOne(newChar)
  return newChar
}

export async function updateCharacter(
  id: string,
  userId: string,
  char: Pick<
    AppSchema.Character,
    'name' | 'avatar' | 'persona' | 'sampleChat' | 'greeting' | 'scenario'
  >
) {
  const edit = { ...char }
  if (edit.avatar === undefined) {
    delete edit.avatar
  }
  await chars.updateOne({ _id: id, userId }, { $set: { ...edit, updatedAt: now() } })
  return getCharacter(id, userId)
}

export async function getCharacter(id: string, userId: string) {
  const char = await chars.findOne({ _id: id, userId })
  return char
}

export async function getCharacters(userId: string) {
  const list = await chars.find({ kind: 'character', userId })
  return list
}

export async function deleteCharacter(charId: string, userId: string) {
  await chars.removeOne({ _id: charId, userId }, {})
}
