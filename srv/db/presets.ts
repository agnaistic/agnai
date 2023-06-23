import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'

export async function updateGenSetting(chatId: string, props: AppSchema.Chat['genSettings']) {
  await db('chat').updateOne({ _id: chatId }, { $set: { genSettings: props, genPreset: '' } })
}

export async function updateGenPreset(chatId: string, preset: string) {
  await db('chat').updateOne(
    { _id: chatId },
    { $set: { genSettings: null as any, genPreset: preset } }
  )
}

export async function createUserPreset(userId: string, settings: AppSchema.GenSettings) {
  const preset: AppSchema.UserGenPreset = {
    _id: v4(),
    kind: 'gen-setting',
    userId,
    ...settings,
  }

  await db('gen-setting').insertOne(preset)
  return preset
}

export async function deleteUserPreset(presetId: string) {
  await db('gen-setting').deleteOne({ _id: presetId })
  return
}

export async function getUserPresets(userId: string) {
  const presets = await db('gen-setting').find({ userId }).toArray()
  return presets
}

export async function updateUserPreset(
  userId: string,
  presetId: string,
  update: AppSchema.GenSettings
) {
  await db('gen-setting').updateOne({ _id: presetId, userId }, { $set: update })
  const updated = await db('gen-setting').findOne({ _id: presetId })
  return updated
}

export async function getUserPreset(presetId: string) {
  const preset = await db('gen-setting').findOne({ _id: presetId })
  return preset
}
