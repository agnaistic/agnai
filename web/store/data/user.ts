import { api, isLoggedIn } from '../api'
import { AppSchema } from '../../../common/types/schema'
import { localApi } from './storage'
import { toArray } from '/common/util'
import { UI } from '/common/types'
import { storage } from '/web/shared/util'
import { HORDE_SEED } from '/common/horde-gen'
import { AIAdapter } from '/common/adapters'

export type InitEntities = {
  profile: AppSchema.Profile
  user: AppSchema.User
  presets: AppSchema.UserGenPreset[]
  config: AppSchema.AppConfig
  books: AppSchema.MemoryBook[]
  replicate: any
  scenarios: AppSchema.ScenarioBook[]
}

export const usersApi = {
  getInit,
  getSubscriptions,
  deleteApiKey,
  getConfig,
  getOpenAIUsage,
  getProfile,
  updateConfig,
  updatePartialConfig,
  updateProfile,
  removeProfileAvatar,
  updateUI,
  updateServiceConfig,
  novelLogin,
}

export async function getInit() {
  if (isLoggedIn()) {
    const res = await api.get<InitEntities>(`/user/init?seed=${HORDE_SEED}&ts=${Date.now()}`)
    return res
  }

  const init = await localApi.handleGuestInit()
  return init
}

export async function getSubscriptions() {
  const res = await api.get<{ subscriptions: AppSchema.SubscriptionModelOption[] }>(
    '/settings/subscriptions'
  )
  return res
}

export async function getProfile(id?: string) {
  if (!isLoggedIn()) {
    // We never retrieve profiles by 'id' for anonymous users
    const profile = await localApi.loadItem('profile')
    return { result: profile, error: undefined }
  }

  const url = id ? `/user/${id}` : `/user`
  return api.get<AppSchema.Profile>(url)
}

export async function getConfig() {
  if (!isLoggedIn()) {
    const config = await localApi.loadItem('config')
    return { result: config, error: undefined }
  }

  return api.get<AppSchema.User>('/user/config')
}

export async function deleteApiKey(kind: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/user/config/${kind}`)
    return res
  }

  const user = await localApi.loadItem('config')
  if (kind === 'novel') {
    user.novelApiKey = ''
    user.novelVerified = false
  }

  if (kind === 'horde') {
    user.hordeKey = ''
    user.hordeName = ''
  }

  if (kind === 'openai') {
    user.oaiKey = ''
    user.oaiKeySet = false
  }

  if (kind === 'scale') {
    user.scaleApiKey = ''
    user.scaleApiKeySet = false
  }

  if (kind === 'claude') {
    user.claudeApiKey = ''
    user.claudeApiKeySet = false
  }

  if (kind === 'third-party') {
    user.thirdPartyPassword = ''
    user.thirdPartyPasswordSet = false
  }

  if (kind === 'elevenlabs') {
    user.elevenLabsApiKey = ''
    user.elevenLabsApiKeySet = false
  }

  await localApi.saveConfig(user)
  return localApi.result({ success: true })
}

export async function updateProfile(handle: string, file?: File) {
  if (!isLoggedIn()) {
    const avatar = await getImageData(file)
    const prev = await localApi.loadItem('profile')
    const next: AppSchema.Profile = {
      ...prev,
      handle,
      avatar: avatar || prev.avatar,
    }

    await localApi.saveProfile(next)
    return { result: next, error: undefined }
  }

  const form = new FormData()
  form.append('handle', handle)
  if (file) form.append('avatar', file)

  const res = await api.upload<AppSchema.Profile>('/user/profile', form)
  return res
}

async function removeProfileAvatar() {
  if (!isLoggedIn()) {
    const prev = await localApi.loadItem('profile')
    const next: AppSchema.Profile = {
      ...prev,
      avatar: undefined,
    }
    await localApi.saveProfile(next)
    return { result: next, error: undefined }
  }

  const res = await api.method('delete', '/user/profile/avatar')
  return res
}

type ConfigUpdate = Partial<AppSchema.User> & { hordeModels?: string[] }

export async function updatePartialConfig(config: ConfigUpdate) {
  if (!isLoggedIn()) {
    const prev = await localApi.loadItem('config')
    const next: AppSchema.User = { ...prev, ...config }

    await localApi.saveConfig(next)
    return { result: next, error: undefined }
  }

  const res = await api.post('/user/config/partial', config)
  return res
}

export async function updateConfig(config: ConfigUpdate) {
  if (!isLoggedIn()) {
    const prev = await localApi.loadItem('config')
    const next: AppSchema.User = { ...prev, ...config }

    if (prev.novelApiKey && !next.novelApiKey) {
      next.novelApiKey = prev.novelApiKey
    }

    if (prev.oaiKey && !next.oaiKey) {
      next.oaiKey = prev.oaiKey
    }

    if (prev.elevenLabsApiKey && !next.elevenLabsApiKey) {
      next.elevenLabsApiKey = prev.elevenLabsApiKey
    }

    next.hordeModel = toArray(config.hordeModels)

    await localApi.saveConfig(next)
    return { result: next, error: undefined }
  }

  const res = await api.post('/user/config', config)
  return res
}

export async function updateServiceConfig(service: AIAdapter, update: any) {
  if (!isLoggedIn()) {
    const config = await localApi.loadItem('config')
    const prev = config.adapterConfig?.[service] || {}
    const next = { ...prev, ...update }
    const nextConfig = {
      ...config,
      adapterConfig: {
        ...config.adapterConfig,
        [service]: next,
      },
    }

    await localApi.saveConfig(nextConfig)
    return { result: nextConfig, error: undefined }
  }

  const res = await api.post(`/user/config/service/${service}`, update)
  return res
}

export async function updateUI(ui: UI.UISettings) {
  if (isLoggedIn()) {
    const res = await api.post('/user/ui', ui)
    if (res.result) {
      storage.removeItem('ui-settings')
    }
    return res
  }

  const config = await localApi.loadItem('config')
  const next: AppSchema.User = { ...config, ui }
  await localApi.saveConfig(next)
  return { success: true }
}

export async function getOpenAIUsage() {
  if (isLoggedIn()) {
    const res = await api.post('/user/services/openai-usage')
    return res
  }

  const user = await localApi.loadItem('config')
  if (!user.oaiKey) {
    return localApi.error(`OpenAI key not set`)
  }

  return api.post('/user/services/openai-usage', { key: user.oaiKey })
}

async function getImageData(file?: File) {
  if (!file) return
  const reader = new FileReader()

  return new Promise<string>((resolve, reject) => {
    reader.readAsDataURL(file)

    reader.onload = (evt) => {
      if (!evt.target?.result) return reject(new Error(`Failed to process image`))
      resolve(evt.target.result.toString())
    }
  })
}

async function novelLogin(key: string) {
  const res = await api.post('/user/services/novel', { key })

  if (!isLoggedIn() && res.result) {
    const user = await localApi.loadItem('config')
    const next = { ...user, ...res.result }
    await localApi.saveConfig(next)
    return localApi.result(next)
  }

  return res
}
