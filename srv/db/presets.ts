import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'
import { now } from './util'
import { StatusError } from '../api/wrap'

export async function createTemplate(
  userId: string,
  { template, name }: { name: string; template: string }
) {
  const row: AppSchema.PromptTemplate = {
    _id: v4(),
    kind: 'prompt-template',
    userId,
    name,
    template,
    createdAt: now(),
    updatedAt: now(),
  }

  await db('prompt-template').insertOne(row)
  return row
}
export async function updateTemplate(
  userId: string,
  id: string,
  update: { name: string; template: string }
) {
  const result = await db('prompt-template').updateOne(
    { userId, _id: id },
    { $set: { ...update, updatedAt: now() } }
  )
  if (result.modifiedCount === 0) throw new StatusError('Prompt template not found', 404)
}

export async function deleteTemplate(userId: string, id: string) {
  const result = await db('prompt-template').deleteOne({ _id: id, userId })
  if (result.deletedCount === 0) throw new StatusError('Prompt template not found', 404)
}

export async function getTemplate(id: string) {
  const template = await db('prompt-template').findOne({ _id: id })
  return template
}

export async function getUserTemplates(userId: string) {
  const templates = await db('prompt-template').find({ userId }).toArray()
  return templates
}

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
  if (update.registered) {
    const prev = await getUserPreset(presetId)
    update.registered = {
      ...prev?.registered,
      ...update.registered,
    }
  }

  await db('gen-setting').updateOne({ _id: presetId, userId }, { $set: update })
  const updated = await db('gen-setting').findOne({ _id: presetId })
  return updated
}

export async function getUserPreset(presetId: string) {
  const preset = await db('gen-setting').findOne({ _id: presetId })
  return preset
}
