import { AppSchema } from '../../srv/db/schema'
import { EVENTS, events } from '../emitter'
import { FileInputResult } from '../shared/FileInput'
import { api, clearAuth, getAuth, setAuth } from './api'
import { createStore } from './create'
import { localApi } from './data/storage'
import { usersApi } from './data/user'
import { publish } from './socket'
import { toastStore } from './toasts'

const UI_KEY = 'ui-settings'
const BACKGROUND_KEY = 'ui-bg'

export type UISettings = {
  theme: ThemeColor
  mode: ThemeMode
  avatarSize: AvatarSize
  avatarCorners: AvatarCornerRadius
  font: FontSetting

  /** 0 -> 1. 0 = transparent. 1 = opaque */
  msgOpacity: number

  chatWidth?: 'full' | 'narrow'
  logPromptsToBrowserConsole: boolean
}

const defaultUIsettings: UISettings = {
  theme: 'sky',
  mode: 'dark',
  avatarSize: 'md',
  avatarCorners: 'circle',
  font: 'default',
  msgOpacity: 0.8,
  chatWidth: 'full',
  logPromptsToBrowserConsole: false,
}

const fontFaces: { [key in FontSetting]: string } = {
  lato: 'Lato, sans-serif',
  default: 'unset',
}

export const AVATAR_SIZES = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const
export const AVATAR_CORNERS = ['sm', 'md', 'lg', 'circle', 'none'] as const
export const UI_MODE = ['light', 'dark'] as const
export const UI_THEME = ['blue', 'sky', 'teal', 'orange', 'rose', 'pink', 'purple'] as const
export const UI_FONT = ['default', 'lato'] as const

export type UserState = {
  loading: boolean
  error?: string
  loggedIn: boolean
  jwt: string
  profile?: AppSchema.Profile
  user?: AppSchema.User
  ui: UISettings
  background?: string
  metadata: {
    openaiUsage?: number
  }
  oaiUsageLoading: boolean
}

export type ThemeColor = (typeof UI_THEME)[number]
export type ThemeMode = (typeof UI_MODE)[number]
export type AvatarSize = (typeof AVATAR_SIZES)[number]
export type AvatarCornerRadius = (typeof AVATAR_CORNERS)[number]
export type FontSetting = (typeof UI_FONT)[number]

export const userStore = createStore<UserState>(
  'user',
  init()
)((get, set) => {
  events.on('session-expired', () => {
    userStore.logout()
  })

  events.on('init', (init) => {
    userStore.setState({ user: init.user, profile: init.profile })
  })

  return {
    async getProfile() {
      const res = await usersApi.getProfile()
      if (res.error) return toastStore.error(`Failed to get profile`)
      if (res.result) {
        return { profile: res.result }
      }
    },

    async getConfig() {
      const res = await usersApi.getConfig()
      if (res.error) return toastStore.error(`Failed to get user config`)
      if (res.result) {
        return { user: res.result }
      }
    },

    async updateProfile(_, profile: { handle: string; avatar?: File }) {
      const res = await usersApi.updateProfile(profile.handle, profile.avatar)
      if (res.error) toastStore.error(`Failed to update profile: ${res.error}`)
      if (res.result) {
        toastStore.success(`Updated profile`)
        return { profile: res.result }
      }
    },

    async updateConfig(_, config: Partial<AppSchema.User>) {
      const res = await usersApi.updateConfig(config)
      if (res.error) toastStore.error(`Failed to update config: ${res.error}`)
      if (res.result) {
        toastStore.success(`Updated settings`)
        return { user: res.result }
      }
    },

    async changePassword(_, password: string, onSuccess?: Function) {
      const res = await api.post('/user/password', { password })
      if (res.error) return toastStore.error('Failed to change password')
      if (res.result) {
        toastStore.success(`Successfully changed password`)
        onSuccess?.()
      }
    },

    async *login(_, username: string, password: string, onSuccess?: () => void) {
      yield { loading: true }

      const res = await api.post('/user/login', { username, password })
      yield { loading: false }
      if (res.error) {
        return toastStore.error(`Authentication failed`)
      }

      setAuth(res.result.token)

      yield {
        loading: false,
        loggedIn: true,
        user: res.result.user,
        profile: res.result.profile,
        jwt: res.result.token,
      }

      events.emit(EVENTS.loggedOut)

      onSuccess?.()
      publish({ type: 'login', token: res.result.token })
    },
    async *register(
      _,
      newUser: { handle: string; username: string; password: string },
      onSuccess?: () => void
    ) {
      yield { loading: true }

      const res = await api.post('/user/register', newUser)
      yield { loading: false }
      if (res.error) {
        return toastStore.error(`Failed to register`)
      }

      setAuth(res.result.token)

      yield {
        loggedIn: true,
        user: res.result.user,
        profile: res.result.profile,
        jwt: res.result.token,
      }

      toastStore.success('Welcome to Agnaistic')
      onSuccess?.()
      publish({ type: 'login', token: res.result.token })
    },
    logout() {
      events.emit(EVENTS.loggedOut)
      clearAuth()
      publish({ type: 'logout' })
      return { jwt: '', profile: undefined, user: undefined, loggedIn: false }
    },

    updateUI({ ui }, update: Partial<UISettings>) {
      const next = { ...ui, ...update }
      updateTheme(next)
      return { ui: next }
    },

    setBackground(_, file: FileInputResult | null) {
      if (!file) {
        setBackground(null)
        return { background: undefined }
      }

      setBackground(file.content)
      return { background: file.content }
    },

    async deleteKey(
      { user },
      kind: 'novel' | 'horde' | 'openai' | 'scale' | 'claude' | 'third-party'
    ) {
      const res = await usersApi.deleteApiKey(kind)
      if (res.error) return toastStore.error(`Failed to update settings: ${res.error}`)

      if (!user) return
      if (kind === 'novel') {
        return { user: { ...user, novelApiKey: '', novelVerified: false } }
      }

      if (kind === 'horde') {
        return { user: { ...user, hordeKey: '', hordeName: '' } }
      }

      if (kind === 'claude') {
        return { user: { ...user, claudeApiKey: '', claudeApiKeySet: false } }
      }
      if (kind === 'third-party') {
        return { user: { ...user, thirdPartyPassword: '' } }
      }
    },

    clearGuestState() {
      const chats = localApi.loadItem('chats')
      for (const chat of chats) {
        localStorage.removeItem(`messages-${chat._id}`)
      }

      for (const key in localApi.KEYS) {
        localStorage.removeItem(key)
        localApi.loadItem(key as any)
      }

      toastStore.error(`Guest state successfully reset`)
      userStore.logout()
    },
    async *openaiUsage({ metadata, user }) {
      yield { oaiUsageLoading: true }
      const res = await api.post('/user/services/openai-usage', { key: user?.oaiKey })
      yield { oaiUsageLoading: false }
      if (res.error) {
        toastStore.error(`Could not retrieve usage: ${res.error}`)
        yield { metadata: { ...metadata, openaiUsage: -1 } }
      }

      if (res.result) {
        yield {
          metadata: {
            ...metadata,
            openaiUsage: res.result.total_usage,
            openaiCosts: res.result.daily_costs,
          },
        }
      }
    },
  }
})

function init(): UserState {
  const existing = getAuth()
  const ui = getUIsettings()
  const background = localStorage.getItem(BACKGROUND_KEY) || undefined

  updateTheme(ui)

  if (!existing) {
    return {
      loading: false,
      jwt: '',
      loggedIn: false,
      ui,
      background,
      oaiUsageLoading: false,
      metadata: {},
    }
  }

  return {
    loggedIn: true,
    loading: false,
    jwt: existing,
    ui,
    background,
    oaiUsageLoading: false,
    metadata: {},
  }
}

function updateTheme(ui: UISettings) {
  localStorage.setItem(UI_KEY, JSON.stringify(ui))
  const root = document.documentElement
  for (let shade = 100; shade <= 900; shade += 100) {
    const num = ui.mode === 'light' ? 1000 - shade : shade

    const color = getComputedStyle(root).getPropertyValue(`--${ui.theme}-${num}`)
    root.style.setProperty(`--hl-${shade}`, color)

    const bg = getComputedStyle(root).getPropertyValue(`--dark-${num}`)
    root.style.setProperty(`--bg-${shade}`, bg)

    const text = getComputedStyle(root).getPropertyValue(`--dark-${900 - (num - 100)}`)
    root.style.setProperty(`--text-${shade}`, text)
  }

  root.style.setProperty(`--sitewide-font`, fontFaces[ui.font])
}

function getUIsettings() {
  const json = localStorage.getItem(UI_KEY) || JSON.stringify(defaultUIsettings)
  const settings: UISettings = JSON.parse(json)
  const theme = (localStorage.getItem('theme') || settings.theme) as ThemeColor
  localStorage.removeItem('theme')

  if (theme && UI_THEME.includes(theme)) {
    settings.theme = theme
  }

  return { ...defaultUIsettings, ...settings }
}

function setBackground(content: any) {
  if (content === null) {
    localStorage.removeItem(BACKGROUND_KEY)
    return
  }

  localStorage.setItem(BACKGROUND_KEY, content)
}
