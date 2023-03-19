import * as local from './storage'
import { api, isLoggedIn } from '../api'
import { AppSchema } from '../../../srv/db/schema'

const emptyCfg: AppSchema.AppConfig = {
  adapters: [],
  canAuth: false,
  version: '',
}

export async function getInit() {
  if (isLoggedIn()) {
    const res = await api.get<{
      profile: AppSchema.Profile
      user: AppSchema.User
      presets: AppSchema.UserGenPreset[]
      config: AppSchema.AppConfig
    }>('/user/init')
    return res
  }

  const user = local.loadItem('config')
  const profile = local.loadItem('profile')
  const presets = local.loadItem('presets')
  const memory = local.loadItem('memory')
  const res = await api.get<AppSchema.AppConfig>('/settings')

  if (res.error) {
    return local.result({
      user,
      profile,
      presets,
      memory,
      config: emptyCfg,
    })
  }

  return local.result({
    user,
    profile,
    presets,
    config: res.result!,
  })
}

export async function getProfile(id?: string) {
  if (!isLoggedIn()) {
    // We never retrieve profiles by 'id' for anonymous users
    const profile = local.loadItem('profile')
    return { result: profile, error: undefined }
  }

  const url = id ? `/user/${id}` : `/user`
  return api.get<AppSchema.Profile>(url)
}

export async function getConfig() {
  if (!isLoggedIn()) {
    const config = local.loadItem('config')
    return { result: config, error: undefined }
  }

  return api.get<AppSchema.User>('/user/config')
}

export async function deleteApiKey(kind: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/user/config/${kind}`)
    return res
  }

  const user = local.loadItem('config')
  if (kind === 'novel') {
    user.novelApiKey = ''
    user.novelVerified = false
  }

  if (kind === 'horde') {
    user.hordeKey = ''
    user.hordeName = ''
  }

  local.saveConfig(user)
  return local.result({ success: true })
}

export async function updateProfile(handle: string, file?: File) {
  if (!isLoggedIn()) {
    const avatar = await getImageData(file)
    const prev = local.loadItem('profile')
    const next: AppSchema.Profile = {
      ...prev,
      handle,
      avatar: avatar || prev.avatar,
    }
    local.saveProfile(next)
    return { result: next, error: undefined }
  }

  const form = new FormData()
  form.append('handle', handle)
  if (file) form.append('avatar', file)

  const res = await api.upload<AppSchema.Profile>('/user/profile', form)
  return res
}

export async function updateConfig(config: Partial<AppSchema.User>) {
  if (!isLoggedIn()) {
    const prev = local.loadItem('config')
    const next: AppSchema.User = { ...prev, ...config }
    local.saveConfig(next)
    return { result: next, error: undefined }
  }

  const res = await api.post('/user/config', config)
  return res
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
