import { HordeModel, HordeWorker } from '../../common/adapters'
import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { setAssetPrefix, storage } from '../shared/util'
import { api } from './api'
import { createStore, getStore } from './create'
import { InitEntities, usersApi } from './data/user'
import { toastStore } from './toasts'
import { subscribe } from './socket'
import { FeatureFlags, defaultFlags } from './flags'
import { ReplicateModel } from '/common/types/replicate'
import { getSubscriptionModelLimits, tryParse, wait } from '/common/util'
import { ButtonSchema } from '../shared/Button'
import { canUsePane, isMobile } from '../shared/hooks'
import { setContextLimitStrategy } from '/common/prompt'
import { filterImageModels } from '/common/image-util'
import type { FeatherlessModel } from '/srv/adapter/featherless'
import type { ArliModel } from '/srv/adapter/arli'

export type SettingState = {
  guestAccessAllowed: boolean
  initLoading: boolean
  cfg: {
    loading: boolean
    ttl: number
  }

  showMenu: boolean
  showImpersonate: boolean
  config: AppSchema.AppConfig

  allImageModels: AppSchema.ImageModel[]
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
  showImage?: {
    url: string
    options: Array<{ schema: ButtonSchema; text: string; onClick: () => void }>
  }

  flags: FeatureFlags
  replicate: Record<string, ReplicateModel>
  featherless: { models: FeatherlessModel[]; classes: Record<string, { ctx: number; res: number }> }
  arliai: { models: ArliModel[]; classes: Record<string, { ctx: number; res: number }> }
  showSettings: boolean
  showImgSettings: boolean

  slotsLoaded: boolean
  slots: { publisherId: string; provider?: 'google' | 'ez' | 'fuse' } & Record<string, any>
  overlay: boolean
}

const HORDE_URL = `https://aihorde.net/api/v2`

const FLAG_KEY = 'agnai-flags'

const initState: SettingState = {
  anonymize: JSON.parse(storage.localGetItem('agnai-anonymize') || 'false'),
  guestAccessAllowed: canUseStorage(),
  initLoading: true,
  cfg: { loading: false, ttl: 0 },
  showMenu: isMobile() || location.search.includes('callback=') ? false : true,
  showImpersonate: false,
  models: [],
  workers: [],
  imageWorkers: [],
  allImageModels: [],
  config: {
    serverConfig: {} as any,
    registered: [],
    adapters: [],
    canAuth: true,
    version: '...',
    assetPrefix: '',
    selfhosting: false,
    imagesSaved: false,
    pipelineProxyEnabled: false,
    authUrls: [],
    horde: { workers: [], models: [] },
    openRouter: { models: [] },
    subs: [],
  },
  replicate: {},
  featherless: { models: [], classes: {} },
  arliai: { models: [], classes: {} },
  flags: getFlags(),
  showSettings: false,
  showImgSettings: false,
  slotsLoaded: false,
  slots: { publisherId: '' },
  overlay: false,
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

  events.on(EVENTS.loggedIn, () => {
    const prev = get()
    settingStore.setState({ ...initState, slots: prev.slots, slotsLoaded: prev.slotsLoaded })
    settingStore.init()
  })

  events.on(EVENTS.configUpdated, (config) => {
    const prev = get().config
    settingStore.setState({ config: { ...prev, serverConfig: config } })
  })

  events.on('checkout-success', () => {
    settingStore.getConfig()
  })

  return {
    modal({ showSettings }, show?: boolean) {
      const next = show ?? !showSettings
      return { showSettings: next }
    },
    imageSettings({ showImgSettings }, next?: boolean) {
      if (next === undefined) {
        return { showImgSettings: !showImgSettings }
      }

      return { showImgSettings: next }
    },
    async *init({ config: prev }) {
      yield { initLoading: true }
      const res = await usersApi.getInit()

      if (res.result) {
        const init = res.result as InitEntities
        setAssetPrefix(init.config.assetPrefix)
        loadSlotConfig(init.config?.serverConfig?.slots)

        const isMaint = init.config?.maintenance

        if (init.config.serverConfig) {
          yield { allImageModels: init.config.serverConfig.imagesModels || [] }

          if (!init.config.tier?.imagesAccess && !init.user?.admin) {
            init.config.serverConfig.imagesModels = []
          } else {
            init.config.serverConfig.imagesModels = filterImageModels(
              init.user,
              init.config.serverConfig.imagesModels,
              init.config.tier
            )
          }
        }

        if (!isMaint) {
          events.emit(EVENTS.init, init)
        }

        yield {
          init,
          config: init.config,
          replicate: init.replicate || {},
          initLoading: false,
        }

        const maint = init.config?.maintenance

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
          yield { initLoading: false }
          return
        }
        setTimeout(() => settingStore.init(), 2500)
      }
    },
    toggleOverlay({ overlay }, next?: boolean) {
      return { overlay: next === undefined ? !overlay : next }
    },
    menu({ showMenu }, next?: boolean) {
      return { showMenu: next ?? !showMenu, overlay: next ?? !showMenu }
    },
    closeMenu: () => {
      if (canUsePane()) return
      return { showMenu: false, overlay: false }
    },
    toggleImpersonate: ({ showImpersonate }, show?: boolean) => {
      return { showImpersonate: show ?? !showImpersonate }
    },
    async getFeatherless() {
      const res = await api.get('/settings/featherless')

      if (res.result?.models?.length) {
        return { featherless: res.result }
      }
    },
    async getArliAI() {
      const res = await api.get('/settings/arli')

      if (res.result?.models?.length) {
        return { arliai: res.result }
      }
    },
    async *getServerConfig({ cfg, config, init }) {
      if (cfg.loading) return

      yield { cfg: { loading: true, ttl: cfg.ttl } }
      const res = await api.get<AppSchema.AppConfig>('/settings')
      yield { cfg: { loading: false, ttl: cfg.ttl } }

      const serverConfig = res.result?.serverConfig
      if (serverConfig) {
        serverConfig.imagesModels = filterImageModels(
          init?.user!,
          serverConfig.imagesModels,
          res.result?.tier
        )
        return { config: { ...config, serverConfig } }
      }
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
      storage.localSetItem('agnai-anonymize', JSON.stringify(!anonymize))
      return { anonymize: !anonymize }
    },
    showImage(
      _,
      image: string,
      options: Array<{ schema: ButtonSchema; text: string; onClick: () => void }> = []
    ) {
      return { showImage: { url: image, options } }
    },
    clearImage() {
      return { showImage: undefined }
    },
    flag({ flags }, flag: keyof FeatureFlags, value: boolean) {
      const nextFlags = { ...flags, [flag]: value }
      window.flags = nextFlags
      saveFlags(nextFlags)
      return { flags: nextFlags }
    },
  }
})

setContextLimitStrategy((user, gen) => {
  const {
    config: { subs },
  } = settingStore.getState()
  const { sub } = getStore('user').getState()
  if (!gen || gen.service !== 'agnaistic') return

  const tier = subs.find((sub) => sub._id === gen.registered?.agnaistic?.subscriptionId || '')
  if (!tier) return

  const level = sub?.level ?? -1

  const limits = getSubscriptionModelLimits(tier.preset, level)
  if (!limits) return

  return { context: limits.maxContextLength, tokens: limits.maxTokens }
})

let firstConnection = true
subscribe('connected', { uid: 'string' }, (body) => {
  if (firstConnection) {
    firstConnection = false
    return
  }

  const { initLoading } = settingStore.getState()
  if (initLoading) return

  settingStore.getConfig()
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

async function loadSlotConfig(serverSlots?: string) {
  const slots: any = { publisherId: '' }
  const server = serverSlots ? tryParse(serverSlots) || {} : {}

  const useDev = location.host !== 'agnai.chat'

  try {
    const content = await fetch('/slots.txt', { cache: 'no-cache' }).then((res) => res.text())
    const config = tryParse(content) || {}

    for (const [prop, value] of Object.entries(config)) {
      const key = prop as keyof typeof slots
      slots[key] = value
    }

    const devInject = useDev ? server?.dev_inject : undefined
    const devProvider = useDev ? server?.dev_provider : undefined
    const inject = devInject || server.inject || config.inject

    server.provider = devProvider || server.provider || slots.provider

    if (server.provider && inject) {
      await wait(0.2)
      const node = document.createRange().createContextualFragment(inject)
      try {
        document.head.append(node)
      } catch (ex) {}
    }
  } catch (ex: any) {
    console.log(ex.message)
  } finally {
    await wait(0.01)
    settingStore.setState({ slots: Object.assign(slots, server), slotsLoaded: true })
  }
}

subscribe('configuration-update', { configuration: 'any' }, (body) => {
  const { config } = settingStore.getState()
  settingStore.setState({
    config: {
      ...config,
      serverConfig: body.configuration,
    },
  })
})

subscribe('submodel-updated', { model: 'any' }, (body) => {
  const { config } = settingStore.getState()
  const incoming: AppSchema.SubscriptionModelOption = body.model

  const exists = config.subs.find((sub) => sub._id === incoming._id)

  const next = exists
    ? config.subs.map((sub) => (sub._id === incoming._id ? incoming : sub))
    : config.subs.concat(incoming)

  const opts = next.map((sub) => ({ label: sub.name, value: sub._id }))

  const registered = config.registered.map((reg) => {
    if (reg.name !== 'agnaistic') return reg
    const settings = reg.settings.map((s) =>
      s.field === 'subscriptionId' ? { ...s, setting: { ...s.setting, options: opts } } : s
    )
    return { ...reg, settings }
  })

  if (!exists) {
    const { user, userLevel } = getStore('user').getState()
    const isEligible = incoming.level <= userLevel || !!user?.admin
    if (isEligible) {
      toastStore.success(`A new model has been added: "${incoming.name}"`, 30)
    }
  }

  settingStore.setState({ config: { ...config, subs: next, registered } })
})

subscribe(
  'subscription-replaced',
  { subscriptionId: 'string', replacementId: 'string' },
  (body) => {
    const { config } = settingStore.getState()
    const next = config.subs.filter((sub) => sub._id !== body.subscriptionId)

    settingStore.setState({ config: { ...config, subs: next } })
  }
)
