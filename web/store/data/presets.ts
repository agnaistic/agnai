import { v4 } from 'uuid'
import { AppSchema } from '../../../common/types/schema'
import { api, isLoggedIn } from '../api'
import { loadItem, localApi } from './storage'
import { now, replace } from '/common/util'
import { joinUrl } from '/common/requests/util'
import { toastStore } from '../toasts'
import { storage } from '/web/shared/util'
import { getStore } from '../create'
import { getSafeProviderDetail } from '/common/providers'

export type PresetUpdate = Omit<AppSchema.UserGenPreset, '_id' | 'kind' | 'userId'>
export type PresetCreate = PresetUpdate & { chatId?: string }
export type SubscriptionUpdate = Omit<AppSchema.SubscriptionModel, 'kind' | '_id' | 'deletedAt'>

export const presetApi = {
  getPresets,
  getPreset,
  createPreset,
  editPreset,
  deletePreset,
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,
  deleteUserPresetKey,
  getModelListByPreset,
  testLocalUrl,
}

export async function getPresets() {
  if (isLoggedIn()) {
    const res = await api.get<{ presets: AppSchema.UserGenPreset[] }>('/user/presets')
    return res
  }

  const presets = await loadItem('presets')
  return localApi.result({ presets })
}

export async function getPreset(id: string) {
  if (isLoggedIn()) {
    const res = await api.get<AppSchema.UserGenPreset>(`/user/presets/${id}`)
    return res
  }

  const presets = await loadItem('presets')
  const preset = presets.find((p) => p._id === id)

  if (!preset) {
    return localApi.error('Preset not found')
  }

  return localApi.result(preset)
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

async function getLocalModelList(opts: {
  url: string
  key?: string
}): Promise<{ models: string[]; data?: any[] }> {
  try {
    const headers: any = {}

    if (opts.key) {
      headers.Authorization = `Bearer ${opts.key}`
      headers['x-api-key'] = opts.key
    }

    const res = await fetch(joinUrl(opts.url, '/models'), { headers }).then((res) => res.json())

    const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []
    const models: string[] = []

    if (list) {
      for (const model of res.data) {
        if (!model || typeof model.id !== 'string') continue
        models.push(model.id)
      }
    }

    models.sort((l, r) => l.localeCompare(r))

    // if (models.length) {
    //   MODEL_LIST_CACHE.set(opts.url, { models, result: res.data })
    // }

    return { models, data: res?.data }
  } catch (ex: any) {
    return { models: [] }
  }
}

async function testLocalUrl(opts: { url: string; key?: string }) {
  const headers: any = {}

  if (opts.key) {
    headers.Authorization = `Bearer ${opts.key}`
    headers['x-api-key'] = opts.key
  }

  try {
    const res = await fetch(joinUrl(opts.url, '/models'), { headers }).then((res) => res.json())
    return localApi.result({ url: opts.url, success: true, json: res })
  } catch (ex) {}

  try {
    const res = await fetch(joinUrl(opts.url, '/v1/models'), { headers }).then((res) => res.json())
    return localApi.result({ url: joinUrl(opts.url, '/v1'), success: true, json: res })
  } catch (ex) {}

  return localApi.result({ success: false, url: opts.url })
}

async function getModelListByPreset(preset: Partial<AppSchema.UserGenPreset>, force = false) {
  if (preset.providerId === 'agnaistic') return
  if (!preset.providerId && preset.service === 'agnaistic') return

  const providers = getStore('user').getState().user?.providers || []
  const provider = preset.providerId
    ? providers.find((p) => p._id === preset.providerId)
    : undefined
  const detail = getSafeProviderDetail(provider?.provider || '')

  let url = preset.thirdPartyUrl || ''
  let key = preset.thirdPartyKey || ''

  if (provider && detail) {
    switch (detail.category) {
      case 'self':
      case 'custom':
        url = provider.url || detail.detail.url || ''
        break

      case 'known':
        url = detail.detail.url || ''
        break
    }

    if (!url) {
      return { list: [], url: '', data: [] }
    }

    const useLocal = detail.category === 'self' || provider.provider === 'known-openrouter'

    const result = useLocal
      ? await getLocalModelList({ url, key: provider.userKey || provider.key })
      : await getPresetModelList({
          id: preset._id || '',
          providerId: preset.providerId,
          url,
          key: '',
        })

    return { list: result.models, url, data: result.data }
  }

  const known = getSafeProviderDetail(
    preset.service === 'kobold' ? `known-${preset.thirdPartyFormat}` : `known-${preset.service}`
  )

  if (known?.detail?.url) {
    url = known.detail.url
  }

  if (!url) {
    return { list: [], url: '', data: [] }
  }

  const result = preset.localRequests
    ? await getLocalModelList({ url, key: preset.userThirdPartyKey })
    : await getPresetModelList({
        id: preset._id || '',
        url,
        // We pass this for presets that are un-saved
        key,
        useCache: !force,
      })

  return { list: result.models, data: result.data, url }
}

const MODELS_LOADED = new Set<string>()

async function getPresetModelList(opts: {
  id: string
  url: string
  providerId?: string
  key?: string
  useCache?: boolean
}): Promise<{ models: string[]; data?: any[] }> {
  const isGuest = !isLoggedIn()

  if (opts.useCache) {
    const cache = await getCachedModelList(opts.url)
    if (cache?.models.length && cache.models.length > 1) return cache
  }

  const res = await api.post<{ data: any[] }>(`/user/preset-models`, {
    id: isGuest ? '' : opts.id,
    providerId: opts.providerId,
    url: opts.url,
    key: opts.key,
  })
  const models: string[] = []

  if (res.error) {
    toastStore.error(`Could not get models: ${res.error}`)
    const cached = await getCachedModelList(opts.url, true)
    if (cached) return cached

    return { models: [] }
  }

  if (res.result) {
    for (const model of res.result.data) {
      if (!model || typeof model.id !== 'string') continue
      models.push(model.id)
    }
  }

  models.sort((l, r) => l.localeCompare(r))

  const ttl = Date.now() + 60000 * 5 // 30 minutes

  MODELS_LOADED.add(opts.url)
  await storage.setItem(
    `model-list-${opts.url}`,
    JSON.stringify({ ttl, models, data: res.result?.data })
  )

  return { models, data: res.result?.data }
}

async function getCachedModelList(url: string, ignoreTtl: boolean = false) {
  const key = `model-list-${url}`
  const cached = await storage.getItem(key)
  if (!cached) return

  try {
    const json = JSON.parse(cached) as { models: string[]; data: any[]; ttl: number }
    if (!json?.models?.length) return
    if (json && ignoreTtl) return json
    if (json.ttl > Date.now()) return json
  } catch (ex) {}
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
