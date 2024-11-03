import { v4 } from 'uuid'
import { db } from './client'
import { AppSchema } from '../../common/types/schema'
import { decryptText, encryptText, now } from './util'
import { StatusError } from '../api/wrap'
import { BUILTIN_FORMATS } from '/common/presets/templates'

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

export async function updateGenPreset(chatId: string, preset: string) {
  await db('chat').updateOne(
    { _id: chatId },
    { $set: { genSettings: null as any, genPreset: preset } }
  )
}

export async function createUserPreset(userId: string, settings: AppSchema.GenSettings) {
  const preset: AppSchema.UserGenPreset = {
    kind: 'gen-setting',
    ...settings,
    userId,
    _id: v4(),
  }

  if (preset.useAdvancedPrompt) {
    delete preset.promptOrderFormat
  } else {
    preset.modelFormat = preset.promptOrderFormat as any
  }

  const originalKey = preset.thirdPartyKey!
  if (preset.thirdPartyKey) {
    preset.thirdPartyKey = encryptText(preset.thirdPartyKey)
  }

  await db('gen-setting').insertOne(preset)

  if (preset.localRequests && originalKey) {
    preset.thirdPartyKey = originalKey
  } else {
    preset.thirdPartyKey = ''
  }

  return preset
}

export async function deleteUserPreset(presetId: string) {
  await db('gen-setting').deleteOne({ _id: presetId })
  return
}

export async function getUserPresets(userId: string) {
  const presets = await db('gen-setting').find({ userId }).toArray()
  return presets.map((pre) => {
    if (pre.localRequests && pre.thirdPartyKey) {
      pre.thirdPartyKey = decryptText(pre.thirdPartyKey, true)
    } else {
      pre.thirdPartyKey = ''
    }
    return mergeModelFormats(pre)
  })
}

export async function deleteUserPresetKey(userId: string, presetId: string) {
  await db('gen-setting').updateOne({ _id: presetId, userId }, { $set: { thirdPartyKey: '' } })
  const preset = await getUserPreset(presetId, userId)
  return preset
}

export async function updateUserPreset(
  userId: string,
  presetId: string,
  update: Partial<AppSchema.UserGenPreset>
) {
  if (update.userId) {
    delete update.userId
  }

  if (update.registered) {
    const prev = await getUserPreset(presetId)
    update.registered = {
      ...prev?.registered,
      ...update.registered,
    }
  }

  if (update.thirdPartyKey) {
    update.thirdPartyKey = encryptText(update.thirdPartyKey)
  } else {
    delete update.thirdPartyKey
  }

  update.updatedAt = new Date().toISOString()
  await db('gen-setting').updateOne({ _id: presetId, userId }, { $set: update })
  const updated = await db('gen-setting').findOne({ _id: presetId })

  if (updated) {
    if (updated.localRequests && updated.thirdPartyKey) {
      updated.thirdPartyKey = decryptText(updated.thirdPartyKey, true)
    } else {
      updated.thirdPartyKey = ''
    }
  }

  return updated
}

/**
 * This function is for internal API use only
 * The preset from here should never be returned to the user
 *
 * @param presetId
 * @returns
 */
export async function getUserPreset(presetId: string, userId?: string) {
  const preset = await db('gen-setting').findOne({ _id: presetId })
  if (preset?.localRequests && preset.thirdPartyKey && userId === preset.userId) {
    preset.thirdPartyKey = decryptText(preset.thirdPartyKey)
  }
  return mergeModelFormats(preset)
}

function mergeModelFormats(gen: AppSchema.UserGenPreset | null) {
  if (!gen) return gen

  if (gen.useAdvancedPrompt) {
    gen.modelFormat = gen.modelFormat || 'ChatML'
  } else if (gen.promptOrderFormat && gen.promptOrderFormat in BUILTIN_FORMATS) {
    gen.modelFormat = gen.promptOrderFormat as any
  } else {
    gen.modelFormat = 'ChatML'
  }

  delete gen.promptOrderFormat
  return gen
}
