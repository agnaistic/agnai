import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from './schema'
import { now } from './util'

const chars = db('character')

export async function createCharacter(
  char: Pick<
    AppSchema.Character,
    'name' | 'avatar' | 'persona' | 'sampleChat' | 'greeting' | 'scenario'
  >
) {
  const newChar: AppSchema.Character = {
    _id: v4(),
    kind: 'character',
    adapter: 'default',
    createdAt: now(),
    updatedAt: now(),
    ...char,
  }

  await chars.insertOne(newChar)
  return newChar
}

export async function updateCharacter(
  id: string,
  char: Pick<
    AppSchema.Character,
    'name' | 'avatar' | 'persona' | 'sampleChat' | 'greeting' | 'scenario'
  >
) {
  await chars.updateOne({ _id: id }, { $set: { ...char, updatedAt: now() } })
  return getCharacter(id)
}

export async function getCharacter(id: string) {
  const char = await chars.findOne({ _id: id })
  return char
}

export async function getCharacters() {
  const list = await chars.find({ kind: 'character' })
  return list
}

export async function deleteCharacter(charId: string) {
  await chars.removeOne({ _id: charId }, {})
}
