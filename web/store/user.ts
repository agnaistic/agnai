import { AppSchema } from '../../srv/db/schema'
import { api, clearAuth, getAuth, setAuth } from './api'
import { createStore } from './create'
import { data } from './data'
import { local } from './data/storage'
import { settingStore } from './settings'
import { publish } from './socket'
import { toastStore } from './toasts'

const UI_KEY = 'ui-settings'

const defaultUIsettings: State['ui'] = {
  theme: 'sky',
  mode: 'dark',
  avatarSize: 'md',
  avatarCorners: 'circle',
  input: 'single',
}

export const AVATAR_SIZES = ['sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const
export const AVATAR_CORNERS = ['sm', 'md', 'lg', 'circle', 'none'] as const
export const UI_MODE = ['light', 'dark'] as const
export const UI_THEME = ['blue', 'sky', 'teal', 'orange'] as const
export const UI_INPUT_TYPE = ['single', 'multi'] as const

type State = {
  loading: boolean
  error?: string
  loggedIn: boolean
  jwt: string
  profile?: AppSchema.Profile
  user?: AppSchema.User
  ui: {
    theme: ThemeColor
    mode: ThemeMode
    avatarSize: AvatarSize
    avatarCorners: AvatarCornerRadius
    input: ChatInputType
  }
}

export type ThemeColor = (typeof UI_THEME)[number]
export type ThemeMode = (typeof UI_MODE)[number]
export type AvatarSize = (typeof AVATAR_SIZES)[number]
export type AvatarCornerRadius = (typeof AVATAR_CORNERS)[number]
export type ChatInputType = (typeof UI_INPUT_TYPE)[number]

export const userStore = createStore<State>(
  'user',
  init()
)((get, set) => {
  settingStore.subscribe(({ init }, prev) => {
    if (init && !prev.init) {
      userStore.setState({ user: init.user, profile: init.profile })
    }
  })

  return {
    async getProfile() {
      const res = await data.user.getProfile()
      if (res.error) return toastStore.error(`Failed to get profile`)
      if (res.result) {
        return { profile: res.result }
      }
    },

    async getConfig() {
      const res = await data.user.getConfig()
      if (res.error) return toastStore.error(`Failed to get user config`)
      if (res.result) {
        return { user: res.result }
      }
    },

    async updateProfile(_, profile: { handle: string; avatar?: File; selfscription?: string }) {
      const res = await data.user.updateProfile(
        profile.handle,
        profile.avatar,
        profile.selfscription
      )
      if (res.error) toastStore.error(`Failed to update profile`)
      if (res.result) {
        toastStore.success(`Updated settings`)
        return { profile: res.result }
      }
    },

    async updateConfig(_, config: Partial<AppSchema.User>) {
      const res = await data.user.updateConfig(config)
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
        return toastStore.error(`Failed to authenticated`)
      }

      setAuth(res.result.token)

      yield {
        loading: false,
        loggedIn: true,
        user: res.result.user,
        profile: res.result.profile,
        jwt: res.result.token,
      }

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
      clearAuth()
      publish({ type: 'logout' })
      settingStore.setState({ init: undefined })
      settingStore.init()
      return { jwt: '', profile: undefined, user: undefined, loggedIn: false }
    },

    updateUI({ ui }, update: Partial<State['ui']>) {
      const next = { ...ui, ...update }
      updateTheme(next)
      return { ui: next }
    },

    async deleteKey({ user }, kind: 'novel' | 'horde' | 'openai' | 'scale') {
      const res = await data.user.deleteApiKey(kind)
      if (res.error) return toastStore.error(`Failed to update settings: ${res.error}`)

      if (!user) return
      if (kind === 'novel') {
        return { user: { ...user, novelApiKey: '', novelVerified: false } }
      }

      if (kind === 'horde') {
        return { user: { ...user, hordeKey: '', hordeName: '' } }
      }
    },

    clearGuestState() {
      const chats = local.loadItem('chats')
      for (const chat of chats) {
        localStorage.removeItem(`messages-${chat._id}`)
      }

      for (const key in local.KEYS) {
        localStorage.removeItem(key)
        local.loadItem(key as any)
      }

      toastStore.error(`Guest state successfully reset`)
      settingStore.init()
    },
  }
})

function init(): State {
  const existing = getAuth()
  const ui = getUIsettings()
  updateTheme(ui)

  if (!existing) {
    return {
      loading: false,
      jwt: '',
      loggedIn: false,
      ui,
    }
  }

  return {
    loggedIn: true,
    loading: false,
    jwt: existing,
    ui,
  }
}

function updateTheme(ui: State['ui']) {
  localStorage.setItem(UI_KEY, JSON.stringify(ui))
  const root = document.documentElement
  for (let shade = 100; shade <= 900; shade += 100) {
    const num = ui.mode === 'light' ? 1000 - shade : shade

    const color = getComputedStyle(root).getPropertyValue(`--${ui.theme}-${num}`)
    root.style.setProperty(`--hl-${shade}`, color)

    const bg = getComputedStyle(root).getPropertyValue(`--dark-${num}`)
    root.style.setProperty(`--bg-${shade}`, bg)

    const text = getComputedStyle(root).getPropertyValue(`--black-${num}`)
    root.style.setProperty(`--text-${shade}`, text)
  }
}

function getUIsettings() {
  const settings: State['ui'] = JSON.parse(
    localStorage.getItem(UI_KEY) || JSON.stringify(defaultUIsettings)
  )
  const theme = (localStorage.getItem('theme') || 'sky') as ThemeColor
  localStorage.removeItem('theme')

  if (theme && UI_THEME.includes(theme)) {
    settings.theme = theme
  }

  return { ...defaultUIsettings, ...settings }
}
