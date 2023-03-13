import { v4 } from 'uuid'
import { AppSchema } from '../../../srv/db/schema'
import { api, isLoggedIn } from '../api'
import { loadItem, local } from './storage'
import { emptyPreset } from '../../pages/GenerationPresets'

export type PresetUpdate = Omit<AppSchema.UserGenPreset, '_id' | 'kind' | 'userId'>

export async function getPresets() {
  if (isLoggedIn()) {
    const res = await api.get<{ presets: AppSchema.UserGenPreset[] }>('/user/presets')
    return res
  }

  const presets = loadItem('presets')
  return local.result({ presets })
}

export async function createPreset(preset: PresetUpdate) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.UserGenPreset>(`/user/presets`, preset)
    return res
  }

  const newPreset: AppSchema.UserGenPreset = {
    ...preset,
    _id: v4(),
    kind: 'gen-setting',
    userId: local.ID,
  }

  const presets = loadItem('presets').concat(newPreset)
  local.savePresets(presets)

  return local.result(newPreset)
}

export async function editPreset(presetId: string, update: PresetUpdate) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.UserGenPreset>(`/user/presets/${presetId}`, update)
    return res
  }

  const presets = loadItem('presets')
  const prev = presets.find((pr) => pr._id === presetId)
  if (!prev) return local.error(`Preset does not exist`)

  const preset = { ...prev, ...update }
  local.savePresets(local.replace(presetId, presets, preset))
  return local.result(preset)
}

export async function deletePreset(presetId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete',`/user/presets/${presetId}`)
    return res
  }

  const presets = loadItem('presets')
  let preset: AppSchema.UserGenPreset = { _id: '', ...emptyPreset, kind: 'gen-setting', userId: '' }

  for (let i = 0; i < presets.length; i++) {
    const element = presets[i];
    if(element._id === presetId) {
      preset = element
    }
  }

  if(preset._id !== "") {
    local.savePresets(presets.splice(presets.indexOf(preset,1)))
    return {
      result: -1,
      status: 500,
      error: "Preset not found in Local Storage",
    }
  }
  

  return {
    result: 0,
    status: 200,
  }
}
