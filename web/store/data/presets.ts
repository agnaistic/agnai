import { v4 } from 'uuid'
import { AppSchema } from '../../../common/types/schema'
import { api, isLoggedIn } from '../api'
import { loadItem, localApi } from './storage'
import { now, replace } from '/common/util'

export type PresetUpdate = Omit<AppSchema.UserGenPreset, '_id' | 'kind' | 'userId'>
export type PresetCreate = PresetUpdate & { chatId?: string }
export type SubscriptionUpdate = Omit<AppSchema.SubscriptionModel, 'kind' | '_id' | 'deletedAt'>

export const presetApi = {
  getPresets,
  createPreset,
  editPreset,
  deletePreset,
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,
  deleteUserPresetKey,
}

export async function getPresets() {
  if (isLoggedIn()) {
    const res = await api.get<{ presets: AppSchema.UserGenPreset[] }>('/user/presets')
    return res
  }

  const presets = await loadItem('presets')
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

  const presets = await loadItem('presets').then((res) => res.concat(newPreset))
  await localApi.savePresets(presets)

  return localApi.result(newPreset)
}

export async function editPreset(presetId: string, update: Partial<PresetUpdate>) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.UserGenPreset>(`/user/presets/${presetId}`, update)
    return res
  }

  const presets = await loadItem('presets')
  const prev = presets.find((pr) => pr._id === presetId)
  if (!prev) return localApi.error(`Preset does not exist`)

  const preset = { ...prev, ...update }
  await localApi.savePresets(replace(presetId, presets, preset))
  return localApi.result(preset)
}

export async function deletePreset(presetId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/user/presets/${presetId}`)
    return res
  }

  const presets = await loadItem('presets')
  const next = presets.filter((pre) => pre._id !== presetId)
  await localApi.savePresets(next)
  return localApi.result({ success: true })
}

export async function deleteUserPresetKey(presetId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/user/presets/${presetId}/key`)
    return res
  }

  const presets = await loadItem('presets')
  const next = presets.map((pre) => (pre._id === presetId ? { ...pre, thirdPartyKey: '' } : pre))
  await localApi.savePresets(next)
  return localApi.result({ success: true })
}

async function getTemplates() {
  if (isLoggedIn()) {
    const res = await api.get<{ templates: AppSchema.PromptTemplate[] }>('/user/templates')
    return res
  }

  const templates = await loadItem('templates')
  return localApi.result({ templates })
}

async function createTemplate(template: { name: string; template: string; presetId?: string }) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.PromptTemplate>(`/user/templates`, template)
    return res
  }

  const templates = await loadItem('templates')
  const next: AppSchema.PromptTemplate = {
    _id: v4(),
    kind: 'prompt-template',
    name: template.name,
    template: template.template,
    userId: localApi.ID,
    public: false,
    createdAt: now(),
    updatedAt: now(),
  }

  await localApi.saveTemplates(templates.concat(next))
  return localApi.result(next)
}

async function updateTemplate(
  id: string,
  update: { name: string; template: string; presetId?: string }
) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.PromptTemplate>(`/user/templates/${id}`, update)
    return res
  }

  const templates = await loadItem('templates')
  const existing = templates.find((t) => t._id === id)
  if (!existing) {
    return localApi.error('Template not found')
  }

  const replace = { ...existing, ...update }
  const next = templates.map((t) => (t._id === id ? replace : t))
  await localApi.saveTemplates(next)
  return localApi.result(replace)
}

async function deleteTemplate(id: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/user/templates/${id}`)
    return res
  }

  const templates = await loadItem('templates')
  const next = templates.filter((t) => t._id !== id)
  await localApi.saveTemplates(next)
  return localApi.result({ success: true })
}
