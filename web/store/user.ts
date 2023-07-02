import Values from 'values.js'
import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { FileInputResult } from '../shared/FileInput'
import {
  createDebounce,
  getRootVariable,
  hexToRgb,
  safeLocalStorage,
  setRootVariable,
} from '../shared/util'
import { api, clearAuth, getAuth, getUserId, setAuth } from './api'
import { createStore } from './create'
import { localApi } from './data/storage'
import { usersApi } from './data/user'
import { publish, subscribe } from './socket'
import { toastStore } from './toasts'
import { UI } from '/common/types'
import { defaultUIsettings } from '/common/types/ui'

const BACKGROUND_KEY = 'ui-bg'

type ConfigUpdate = Partial<AppSchema.User & { hordeModels?: string[] }>

const fontFaces: { [key in UI.FontSetting]: string } = {
  lato: 'Lato, sans-serif',
  default: 'unset',
}

const [debouceUI] = createDebounce((update: UI.UISettings) => {
  updateTheme(update)
}, 50)

export type UserState = {
  loading: boolean
  error?: string
  loggedIn: boolean
  jwt: string
  profile?: AppSchema.Profile
  user?: AppSchema.User
  ui: UI.UISettings
  current: UI.CustomUI
  background?: string
  metadata: {
    openaiUsage?: number
  }
  oaiUsageLoading: boolean
}

export const userStore = createStore<UserState>(
  'user',
  init()
)((get, set) => {
  events.on(EVENTS.sessionExpired, () => {
    userStore.logout()
  })

  events.on(EVENTS.init, (init) => {
    userStore.setState({ user: init.user, profile: init.profile })

    /**
     * While introducing persisted UI settings, we'll automatically persist settings that the user has in local storage
     */
    if (!init.user.ui) {
      userStore.saveUI(defaultUIsettings)
    } else {
      userStore.receiveUI(init.user.ui)
    }
  })

  return {
    async getProfile() {
      const res = await usersApi.getProfile()
      if (res.error) return toastStore.error(`Failed to get profile`)
      if (res.result) {
        return { profile: res.result }
      }
    },

    async getConfig({ ui }) {
      const res = await usersApi.getConfig()

      if (res.error) return toastStore.error(`Failed to get user config`)
      if (res.result) {
        userStore.saveUI({})
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

    async updateConfig(_, config: ConfigUpdate) {
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

      if (res.result.user.ui) {
        yield { ui: res.result.user.ui }
      }

      // TODO: Work out why this is here
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
      return {
        jwt: '',
        profile: undefined,
        user: undefined,
        loggedIn: false,
        ui: getUIsettings(true),
      }
    },

    async saveUI({ ui }, update: Partial<UI.UISettings>) {
      // const mode = update.mode ? update.mode : ui.mode
      const next: UI.UISettings = { ...ui, ...update }
      const mode = next.mode
      const current = next[next.mode]

      await usersApi.updateUI({ ...next, [mode]: current })

      try {
        updateTheme({ ...next, [mode]: current })
      } catch (e: any) {
        toastStore.error(`Failed to save UI settings: ${e.message}`)
      }

      return { ui: next, current, [mode]: current }
    },

    async saveCustomUI({ ui }, update: Partial<UI.CustomUI>) {
      const current = { ...ui[ui.mode], ...update }

      const next = { ...ui, [ui.mode]: current }
      await usersApi.updateUI(next)

      try {
        updateTheme(next)
      } catch (e: any) {
        toastStore.error(`Failed to save UI settings: ${e.message}`)
      }

      return { ui: next, current }
    },

    tryCustomUI({ ui }, update: Partial<UI.CustomUI>) {
      const prop = ui.mode === 'light' ? 'light' : 'dark'
      const current = { ...ui[prop], ...update }
      const next = { ...ui, current, [prop]: current }
      updateTheme(next)
      return next
    },

    tryUI({ ui }, update: Partial<UI.UISettings>) {
      const mode = update.mode || ui.mode
      const current = ui[mode]
      const next = { current, ...ui, ...update }
      debouceUI(next)
      return { ui: next }
    },

    receiveUI(_, update: UI.UISettings) {
      const current = update[update.mode]
      updateTheme(update)
      return { ui: update, current }
    },

    setBackground(_, file: FileInputResult | null) {
      try {
        if (!file) {
          setBackground(null)
          return { background: undefined }
        }

        setBackground(file.content)
        return { background: file.content }
      } catch (e: any) {
        toastStore.error(`Failed to set background: ${e.message}`)
      }
    },

    async deleteKey(
      { user },
      kind: 'novel' | 'horde' | 'openai' | 'scale' | 'claude' | 'third-party' | 'elevenlabs'
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

      if (kind === 'elevenlabs') {
        return { user: { ...user, elevenLabsApiKey: '', elevenLabsApiKeySet: false } }
      }
    },

    clearGuestState() {
      try {
        const chats = localApi.loadItem('chats')
        for (const chat of chats) {
          safeLocalStorage.removeItem(`messages-${chat._id}`)
        }

        for (const key in localApi.KEYS) {
          safeLocalStorage.removeItem(key)
          localApi.loadItem(key as any)
        }

        toastStore.error(`Guest state successfully reset`)
        userStore.logout()
      } catch (e: any) {
        toastStore.error(`Failed to reset guest state: ${e.message}`)
      }
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

  try {
    safeLocalStorage.test()
  } catch (e: any) {
    toastStore.error(`localStorage unavailable: ${e.message}`)
  }

  const ui = getUIsettings()
  const background = safeLocalStorage.getItem(BACKGROUND_KEY) || undefined

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
      current: ui[ui.mode] || UI.defaultUIsettings[ui.mode],
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
    current: ui[ui.mode] || UI.defaultUIsettings[ui.mode],
  }
}

function updateTheme(ui: UI.UISettings) {
  safeLocalStorage.setItem(getUIKey(), JSON.stringify(ui))
  const root = document.documentElement

  const mode = ui[ui.mode]

  const hex = mode.bgCustom || getSettingColor('--bg-800')
  const colors = mode.bgCustom ? new Values(`${hex}`).all(12).map(({ hex }) => '#' + hex) : []

  if (ui.mode === 'dark') {
    colors.reverse()
  }

  const gradients = ui.bgCustomGradient ? getColorShades(ui.bgCustomGradient) : []

  for (let shade = 100; shade <= 1000; shade += 100) {
    const index = shade / 100 - 1
    const num = ui.mode === 'light' ? 1000 - shade : shade

    if (shade <= 900) {
      const color = getRootVariable(`--${ui.theme}-${num}`)
      const colorRgb = hexToRgb(color)
      root.style.setProperty(`--hl-${shade}`, color)
      root.style.setProperty(`--rgb-hl-${shade}`, `${colorRgb?.rgb}`)

      const text = getRootVariable(`--truegray-${900 - (num - 100)}`)
      const textRgb = hexToRgb(text)
      root.style.setProperty(`--text-${shade}`, text)
      root.style.setProperty(`--rgb-text-${shade}`, `${textRgb?.rgb}`)
    }

    const bg = getRootVariable(`--${ui.themeBg}-${num}`)
    const bgValue = colors.length ? colors[index] : bg
    const bgRgb = hexToRgb(getSettingColor(bgValue))
    const gradient = getSettingColor(gradients.length ? colors[index] : bg)

    root.style.setProperty(`--bg-${shade}`, bgValue)
    root.style.setProperty(`--gradient-${shade}`, gradient)
    root.style.setProperty(`--gradient-bg-${shade}`, `linear-gradient(${bgValue}, ${gradient})`)
    root.style.setProperty(`--rgb-bg-${shade}`, `${bgRgb?.rgb}`)
  }

  setRootVariable('text-chatcolor', getSettingColor(mode.chatTextColor || 'text-800'))
  setRootVariable('text-emphasis-color', getSettingColor(mode.chatEmphasisColor || 'text-600'))
  setRootVariable('bot-background', getSettingColor(mode.botBackground || 'bg-800'))
  root.style.setProperty(`--sitewide-font`, fontFaces[ui.font])
}

function getUIsettings(guest = false) {
  const key = getUIKey(guest)
  const json =
    safeLocalStorage.getItem(key) ||
    safeLocalStorage.getItem('ui-settings') ||
    JSON.stringify(UI.defaultUIsettings)

  const settings: UI.UISettings = JSON.parse(json)
  const theme = (safeLocalStorage.getItem('theme') || settings.theme) as UI.ThemeColor
  safeLocalStorage.removeItem('theme')

  if (theme && UI.UI_THEME.includes(theme)) {
    settings.theme = theme
  }

  const ui = { ...UI.defaultUIsettings, ...settings }

  return ui
}

function setBackground(content: any) {
  if (content === null) {
    safeLocalStorage.removeItemUnsafe(BACKGROUND_KEY)
    return
  }

  safeLocalStorage.setItemUnsafe(BACKGROUND_KEY, content)
}

function adjustColor(color: string, percent: number, target = 0) {
  if (color.startsWith('--')) {
    color = getSettingColor(color)
  } else if (!color.startsWith('#')) {
    color = '#' + color
  }

  const step = [0, 0, 0]

  const hex = [1, 3, 5]
    .map((v, i) => {
      const val = parseInt(color.substring(v, v + 2), 16)
      step[i] = target !== 0 ? (val + target) / 100 : 0
      return val
    })
    .map((v, i) => {
      if (target !== 0) return v + percent * step[i]
      return (v * (100 + percent)) / 100
    })
    .map((v) => Math.min(v, 255))
    .map((v) => Math.round(v))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')

  return '#' + hex
}

function getColorShades(color: string) {
  const colors: string[] = [adjustColor(color, -100), color]
  for (let i = 2; i <= 9; i++) {
    const next = adjustColor(color, i * 100)
    colors.push(next)
  }

  return colors
}

export function getSettingColor(color: string) {
  if (!color) return ''
  if (color.startsWith('#')) return color
  return getRootVariable(color)
}

function getUIKey(guest = false) {
  const userId = guest ? 'anon' : getUserId()
  return `ui-settings-${userId}`
}

subscribe('ui-update', { ui: 'any' }, (body) => {
  userStore.receiveUI(body.ui)
})
