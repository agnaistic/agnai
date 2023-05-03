import { v4 } from 'uuid'
import { AppSchema } from '../../../srv/db/schema'
import { api, isLoggedIn } from '../api'
import { loadItem, localApi } from './storage'

export type PresetUpdate = Omit<AppSchema.UserGenPreset, '_id' | 'kind' | 'userId'>

export const presetApi = {
  getPresets,
  createPreset,
  editPreset,
  deletePreset,
}

export async function getPresets() {
  if (isLoggedIn()) {
    const res = await api.get<{ presets: AppSchema.UserGenPreset[] }>('/user/presets')
    return res
  }

  const presets = loadItem('presets')
  return localApi.result({ presets })
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
    userId: localApi.ID,
  }

  const presets = loadItem('presets').concat(newPreset)
  localApi.savePresets(presets)

  return localApi.result(newPreset)
}

export async function editPreset(presetId: string, update: Partial<PresetUpdate>) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.UserGenPreset>(`/user/presets/${presetId}`, update)
    return res
  }

  const presets = loadItem('presets')
  const prev = presets.find((pr) => pr._id === presetId)
  if (!prev) return localApi.error(`Preset does not exist`)

  const preset = { ...prev, ...update }
  localApi.savePresets(localApi.replace(presetId, presets, preset))
  return localApi.result(preset)
}

export async function deletePreset(presetId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/user/presets/${presetId}`)
    return res
  }

  const presets = loadItem('presets')
  const next = presets.filter((pre) => pre._id !== presetId)
  localApi.savePresets(next)
  return localApi.result({ success: true })
}
