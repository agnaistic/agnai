import { v4 } from 'uuid'
import { AppSchema } from '../../../srv/db/schema'
import { api, isLoggedIn } from '../api'
import { loadItem, local } from './storage'

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

export async function editPreset(presetId: string, update: Partial<PresetUpdate>) {
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
    const res = await api.method('delete', `/user/presets/${presetId}`)
    return res
  }

  const presets = loadItem('presets')
  const next = presets.filter((pre) => pre._id !== presetId)
  local.savePresets(next)
  return local.result({ success: true })
}
