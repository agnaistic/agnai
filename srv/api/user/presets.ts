import { assertValid } from 'frisker'
import { defaultPresets, presetValidator } from '../../../common/presets'
import { store } from '../../db'
import { handle } from '../wrap'
import { AIAdapter } from '../../../common/adapters'

export const getUserPresets = handle(async ({ userId }) => {
  const presets = await store.presets.getUserPresets(userId!)
  return { presets }
})

export const getBasePresets = handle(async () => {
  return { presets: defaultPresets }
})

export const createUserPreset = handle(async ({ userId, body }) => {
  assertValid(presetValidator, body, true)
  const service = body.service as AIAdapter

  const preset = { ...body, service }
  if (!preset.order?.length) {
    preset.order = undefined
  }

  const newPreset = await store.presets.createUserPreset(userId!, preset)
  return newPreset
})

export const updateUserPreset = handle(async ({ params, body, userId }) => {
  assertValid(presetValidator, body, true)
  const service = body.service as AIAdapter

  const preset = await store.presets.updateUserPreset(userId!, params.id, { ...body, service })
  return preset
})

export const deleteUserPreset = handle(async ({ params }) => {
  await store.presets.deleteUserPreset(params.id)

  return { success: true }
})
