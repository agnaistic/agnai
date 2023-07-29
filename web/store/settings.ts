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

type SlotSpec = {
  id: string
  size: string
  calc?: { platform: 'container' | 'page'; height?: number; width?: number }
}

type SlotConfig = {
  publisherId: string

  /**
   * Override SlotKinds
   */
  definitions: Record<string, { sm?: SlotSpec; lg?: SlotSpec; xl?: SlotSpec }>
}

const emptySlots: SlotConfig = {
  publisherId: '',
  definitions: {},
}

export type SettingState = {
  guestAccessAllowed: boolean
  initLoading: boolean
  cfg: {
    loading: boolean
    ttl: number
  }
  showMenu: boolean
  showImpersonate: boolean
  fullscreen: boolean
  config: AppSchema.AppConfig
  models: HordeModel[]
  workers: HordeWorker[]
  imageWorkers: HordeWorker[]
  anonymize: boolean
  pipelineOnline: boolean

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
  slots: typeof emptySlots
}

const HORDE_URL = `https://stablehorde.net/api/v2`

const FLAG_KEY = 'agnai-flags'

const initState: SettingState = {
  anonymize: false,
  guestAccessAllowed: canUseStorage(),
  initLoading: true,
  cfg: { loading: false, ttl: 0 },
  showMenu: false,
  showImpersonate: false,
  fullscreen: false,
  models: [],
  workers: [],
  imageWorkers: [],
  pipelineOnline: false,
  config: {
    registered: [],
    adapters: [],
    canAuth: true,
    version: '...',
    assetPrefix: '',
    selfhosting: false,
    imagesSaved: false,
    pipelineProxyEnabled: false,
    authUrls: ['https://chara.cards', 'https://dev.chara.cards'],
    horde: { workers: [], models: [] },
  },
  replicate: {},
  flags: getFlags(),
  showSettings: false,
  slotsLoaded: false,
  slots: { ...emptySlots },
}

export const settingStore = createStore<SettingState>(
  'settings',
  initState
)((get) => {
  events.on(EVENTS.loggedOut, () => {
    const prev = get()
    settingStore.setState({ ...initState, slots: prev.slots, slotsLoaded: prev.slotsLoaded })
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
    async *getConfig({ cfg }) {
      if (cfg.loading) return
      if (Date.now() - cfg.ttl < 60000) return

      yield { cfg: { loading: true, ttl: Date.now() } }
      const res = await api.get('/settings')
      yield { cfg: { loading: false, ttl: Date.now() } }

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
      window.flags = nextFlags
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
    if (!cache) {
      saveFlags(defaultFlags)
      return defaultFlags
    }

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
    saveFlags(defaultFlags)
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
  const slots: any = { ...emptySlots }

  try {
    const content = await fetch('/slots.txt').then((res) => res.text())
    const config = JSON.parse(content)

    for (const [prop, value] of Object.entries(config)) {
      const key = prop as keyof typeof slots
      slots[key] = value
    }

    if (config.inject) {
      await wait(0.2)
      const node = document.createRange().createContextualFragment(config.inject)
      document.head.append(node)
    }
  } catch (ex: any) {
    console.log(ex.message)
  } finally {
    await wait(0.01)
    settingStore.setState({ slots, slotsLoaded: true })
  }
}
