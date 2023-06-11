import { HordeModel, HordeWorker } from '../../common/adapters'
import { AppSchema } from '../../srv/db/schema'
import { EVENTS, events } from '../emitter'
import { setAssetPrefix } from '../shared/util'
import { api } from './api'
import { createStore } from './create'
import { usersApi } from './data/user'
import { toastStore } from './toasts'
import { subscribe } from './socket'
import { FeatureFlags, defaultFlags } from './flags'

type SettingState = {
  guestAccessAllowed: boolean
  initLoading: boolean
  showMenu: boolean
  showImpersonate: boolean
  fullscreen: boolean
  config: AppSchema.AppConfig
  models: HordeModel[]
  workers: HordeWorker[]
  imageWorkers: HordeWorker[]
  anonymize: boolean

  init?: {
    profile: AppSchema.Profile
    user: AppSchema.User
    presets: AppSchema.UserGenPreset[]
    config: AppSchema.AppConfig
    books: AppSchema.MemoryBook[]
  }
  showImage?: string
  flags: FeatureFlags
}

const HORDE_URL = `https://stablehorde.net/api/v2`

const FLAG_KEY = 'agnai-flags'

const initState: SettingState = {
  anonymize: false,
  guestAccessAllowed: canUseStorage(),
  initLoading: true,
  showMenu: false,
  showImpersonate: false,
  fullscreen: false,
  models: [],
  workers: [],
  imageWorkers: [],
  config: {
    registered: [],
    adapters: [],
    canAuth: true,
    version: '...',
    assetPrefix: '',
    selfhosting: false,
    imagesSaved: false,
    slots: { testing: true, banner: '', menu: '', mobile: '', enabled: false },
  },
  flags: getFlags(),
}

export const settingStore = createStore<SettingState>(
  'settings',
  initState
)((_) => {
  events.on(EVENTS.loggedOut, () => {
    settingStore.setState(initState)
    settingStore.init()
  })

  return {
    async *init({ config: prev }) {
      yield { initLoading: true }
      const res = await usersApi.getInit()
      yield { initLoading: false }

      if (res.result) {
        setAssetPrefix(res.result.config.assetPrefix)
        events.emit(EVENTS.init, res.result)
        yield { init: res.result, config: res.result.config }

        const maint = res.result.config?.maintenance

        if (!maint && prev.maintenance) {
          toastStore.success(`Agnaistic is no longer in maintenance mode`, 10)
        }

        if (maint && !prev.maintenance) {
          toastStore.warn(`Agnaistic is in maintenance mode`, 20)
        }
      }

      if (res.error) {
        if (res.status === 500) {
          toastStore.error(`Could not get settings from server.`)
          return
        }
        setTimeout(() => settingStore.init(), 2500)
      }
    },
    menu({ showMenu }) {
      return { showMenu: !showMenu }
    },
    closeMenu: () => {
      return { showMenu: false }
    },
    toggleImpersonate: ({ showImpersonate }, show?: boolean) => {
      return { showImpersonate: show ?? !showImpersonate }
    },
    fullscreen(_, next: boolean) {
      return { fullscreen: next }
    },
    async getConfig() {
      const res = await api.get('/settings')
      if (res.result) {
        return { config: res.result }
      }
    },
    async getHordeModels() {
      const res = await api.get<{ models: HordeModel[] }>('/horde/models')
      if (res.result) {
        return { models: res.result.models }
      }
    },
    async getHordeWorkers() {
      try {
        const res = await fetch(`${HORDE_URL}/workers?type=text`)
        const json = await res.json()

        return { workers: json }
      } catch (ex) {
        toastStore.error(`Could not retrieve Horde workers`)
        console.error(ex)
      }
    },

    async getHordeImageWorkers() {
      try {
        const res = await fetch(`${HORDE_URL}/workers?type=image`)
        const json = await res.json()

        return { imageWorkers: json }
      } catch (ex) {
        toastStore.error(`Could not retrieve Horde workers`)
        console.error(ex)
      }
    },

    toggleAnonymize({ anonymize }) {
      return { anonymize: !anonymize }
    },
    showImage(_, image?: string) {
      return { showImage: image }
    },
    flag({ flags }, flag: keyof FeatureFlags, value: boolean) {
      const nextFlags = { ...flags, [flag]: value }
      saveFlags(nextFlags)
      return { flags: nextFlags }
    },
  }
})

subscribe('connected', { uid: 'string' }, (body) => {
  const { initLoading } = settingStore.getState()
  if (initLoading) return

  settingStore.init()
})

window.flag = (flag: keyof FeatureFlags, value) => {
  if (!flag) {
    console.log('Available flags:')
    for (const key in defaultFlags) console.log(key)
    return
  }

  if (value === undefined) {
    const { flags } = settingStore.getState()
    value = !flags[flag]
  }

  console.log(`Toggled ${flag} --> ${value}`)
  settingStore.flag(flag as any, value)
}

type FlagCache = { user: FeatureFlags; default: FeatureFlags }

function getFlags(): FeatureFlags {
  try {
    const cache = localStorage.getItem(FLAG_KEY)
    if (!cache) return defaultFlags

    const parsed = JSON.parse(cache) as FlagCache

    const flags: any = parsed.user
    const pastDefaults: any = parsed.default

    for (const [key, value] of Object.entries(defaultFlags)) {
      // If the user does not have the key, set it no matter what
      if (key in flags === false) {
        flags[key] = value
        continue
      }

      // If the 'default' value for the flag has changed, change it for the user
      const prev = pastDefaults[key]
      if (prev !== value) {
        flags[key] = value
        continue
      }
    }

    saveFlags(flags)
    return flags
  } catch (ex) {
    return defaultFlags
  }
}

function saveFlags(flags: {}) {
  try {
    const cache: FlagCache = { user: flags as any, default: defaultFlags }
    localStorage.setItem(FLAG_KEY, JSON.stringify(cache))
  } catch (ex) {}
}

function canUseStorage(noThrow?: boolean) {
  const TEST_KEY = '___TEST'
  localStorage.setItem(TEST_KEY, 'ok')
  const value = localStorage.getItem(TEST_KEY)
  localStorage.removeItem(TEST_KEY)

  if (value !== 'ok') {
    if (!noThrow) throw new Error('Failed to retreive set local storage item')
    return false
  }

  return true
}
