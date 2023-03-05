import { assertValid } from 'frisker'
import { presets } from '../../../common/presets'
import { store } from '../../db'
import { handle } from '../wrap'

const genSetting = {
  name: 'string',
  temp: 'number',
  maxTokens: 'number',
  repetitionPenalty: 'number',
  repetitionPenaltyRange: 'number',
  repetitionPenaltySlope: 'number',
  typicalP: 'number',
  topP: 'number',
  topK: 'number',
  topA: 'number',
  tailFreeSampling: 'number',
  order: ['number?'],
} as const

export const getUserPresets = handle(async ({ userId }) => {
  const presets = await store.users.getUserPresets(userId!)
  return { presets }
})

export const getBasePresets = handle(async () => {
  return { presets }
})

export const createUserPreset = handle(async ({ userId, body }) => {
  assertValid(genSetting, body)

  const preset = { ...body }
  if (!preset.order?.length) {
    preset.order = undefined
  }

  const newPreset = await store.users.createUserPreset(userId!, preset)
  return newPreset
})

export const updateUserPreset = handle(async ({ params, body, userId }) => {
  assertValid(genSetting, body)

  await store.users.updateUserPreset(userId!, params.id, body)
  return { success: true }
})
