import { HordeModel, HordeWorker } from '../../common/adapters'
import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { setAssetPrefix } from '../shared/util'
import { api } from './api'
import { createStore } from './create'
import { usersApi } from './data/user'
import { toastStore } from './toasts'
import { subscribe } from './socket'
import { FeatureFlags, defaultFlags } from './flags'
import { ReplicateModel } from '/common/types/replicate'
import { wait } from '/common/util'

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
  replicate: Record<string, ReplicateModel>
  showSettings: boolean
  slotsLoaded: boolean
  slots: {
    menuLg: string
    menu: string
    banner: string
    mobile: string

    gtmMenu: string
    gtmLeader: string
    gtmContent: string
  }
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
    /** @deprecated */
    slots: { banner: '', menu: '', mobile: '', menuLg: '', gtmContent: '', gtmLeader: '', gtmMenu: '', enabled: false },
    authUrls: ['https://chara.cards', 'https://dev.chara.cards'],
  },
  replicate: {},
  flags: getFlags(),
  showSettings: false,
  slotsLoaded: false,
  slots: {
    menuLg: '',
    menu: '',
    banner: '',
    mobile: '',

    gtmMenu: '',
    gtmLeader: '',
    gtmContent: '',
  },
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
    modal({ showSettings }, show?: boolean) {
      const next = show ?? !showSettings
      return { showSettings: next }
    },
    async *init({ config: prev }) {
      yield { initLoading: true }
      const res = await usersApi.getInit()
      yield { initLoading: false }

      if (res.result) {
        setAssetPrefix(res.result.config.assetPrefix)

        const isMaint = res.result.config?.maintenance
        if (!isMaint) {
          events.emit(EVENTS.init, res.result)
        }

        yield { init: res.result, config: res.result.config, replicate: res.result.replicate || {} }

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

window.flags = {}
window.flag = function (flag: keyof FeatureFlags, value) {
  if (!flag) {
    const state = settingStore((s) => s.flags)
    console.log('Available flags:')
    for (const [key] of Object.entries(defaultFlags)) console.log(key, (state as any)[key])
    return
  }

  if (value === undefined) {
    const { flags } = settingStore.getState()
    value = !flags[flag]
  }

  console.log(`Toggled ${flag} --> ${value}`)
  settingStore.flag(flag as any, value)
}

for (const key of Object.keys(defaultFlags)) {
  Object.defineProperty(window.flag, key, {
    get() {
      window.flag(key)
      return
    },
  })
}

Object.freeze(window.flag)

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
    window.flags = flags
    return flags
  } catch (ex) {
    return defaultFlags
  }
}

function saveFlags(flags: {}) {
  try {
    window.flags = flags
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

loadSlotConfig()

async function loadSlotConfig() {
  const slots = {
    menuLg: '',
    menu: '',
    banner: '',
    mobile: '',

    gtmMenu: '',
    gtmLeader: '',
    gtmContent: '',
  }

  try {
    const content = await fetch('/slots.txt').then((res) => res.text())
    const config = JSON.parse(content)

    for (const [prop, value] of Object.entries(config)) {
      if (typeof value !== 'string') continue
      if (prop in slots === false) continue
      const key = prop as keyof typeof slots

      const inner = await getContent(value)
      slots[key] = inner || ''
    }

    // Disabled for now
    if (config.inject && !config.inject) {
      const inner = await getContent(config.inject)
      if (inner) {
        const node = document.createRange().createContextualFragment(inner)
        document.head.append(node)
      }
    }
  } catch (ex: any) {
    console.log(ex.message)
  } finally {
    await wait(0.01)
    settingStore.setState({ slots, slotsLoaded: true })
  }
}

async function getContent(value: string) {
  if (value.startsWith('http')) {
    const res = await fetch(value)
      .then((res) => res.text())
      .catch(() => null)

    return res
  } else {
    return value
  }
}
