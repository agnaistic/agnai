import Values from 'values.js'
import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { FileInputResult } from '../shared/FileInput'
import { createDebounce, storage } from '../shared/util'
import { api, clearAuth, getAuth, getUserId, isLoggedIn, setAuth } from './api'
import { createStore } from './create'
import { localApi } from './data/storage'
import { usersApi } from './data/user'
import { publish, subscribe } from './socket'
import { toastStore } from './toasts'
import { UI } from '/common/types'
import { UISettings, defaultUIsettings } from '/common/types/ui'
import type { FindUserResponse } from '/common/horde-gen'
import { AIAdapter } from '/common/adapters'
import { getUserSubscriptionTier } from '/common/util'
import {
  getColorShades,
  getRootVariable,
  getSettingColor,
  hexToRgb,
  setRootVariable,
} from '../shared/colors'
import { UserType } from '/common/types/admin'
import { embedApi } from './embeddings'

const BACKGROUND_KEY = 'ui-bg'
export const ACCOUNT_KEY = 'agnai-username'

type ConfigUpdate = Partial<AppSchema.User & { hordeModels?: string[] }>

const fontFaces: { [key in UI.FontSetting]: string } = {
  lato: 'Lato, sans-serif',
  default: 'unset',
}

const [debouceUI] = createDebounce((update: UI.UISettings) => {
  updateTheme(update)
}, 50)

type SubscriberInfo = {
  level: number
  type: AppSchema.SubscriptionType
  tier: AppSchema.SubscriptionTier
}

export type UserState = {
  loading: boolean
  error?: string
  loggedIn: boolean
  userType: UserType | undefined
  userLevel: number
  jwt: string
  profile?: AppSchema.Profile
  user?: AppSchema.User
  ui: UI.UISettings
  current: UI.CustomUI
  background?: string
  metadata: {
    openaiUsage?: number
    hordeStats?: FindUserResponse
  }
  oaiUsageLoading: boolean
  hordeStatsLoading: boolean
  showProfile: boolean
  tiers: AppSchema.SubscriptionTier[]
  billingLoading: boolean
  subLoading: boolean
  subStatus?: {
    status: 'active' | 'cancelling' | 'cancelled' | 'new'
    tierId: string
    customerId: string
    subscriptionId: string
    priceId: string
    downgrading?: {
      tierId: string
      requestedAt: string
      activeAt: string
    }
  }

  sub?: SubscriberInfo
}

const CACHED_SUB_KEY = 'cached-sub'

export const userStore = createStore<UserState>(
  'user',
  init()
)((get, set) => {
  events.on(EVENTS.sessionExpired, () => {
    userStore.logout()
  })

  events.on(EVENTS.init, (init) => {
    userStore.setState({ user: init.user, profile: init.profile, userType: getUserType(init.user) })

    if (
      init.user?.patreonUserId ||
      init.user?.billing ||
      init.user?.manualSub ||
      init.user?.stripeSessions?.length
    ) {
      userStore.retrieveSubscription(true)
    }

    if (init.user?._id !== 'anon') {
      userStore.getTiers()
    }

    window.usePipeline = init.user.useLocalPipeline

    /**
     * While introducing persisted UI settings, we'll automatically persist settings that the user has in local storage
     */
    if (!init.user || !init.user.ui) {
      userStore.saveUI(defaultUIsettings)
    } else {
      userStore.receiveUI(init.user.ui)
    }
  })

  storage.getItem(BACKGROUND_KEY).then((bg) => {
    if (!bg) return
    set({ background: bg })
  })

  return {
    modal({ showProfile }, show?: boolean) {
      return { showProfile: show ?? !showProfile }
    },
    async revealApiKey(_, cb: (key: string) => void) {
      const res = await api.post('/user/config/reveal-key')
      if (res.result) {
        cb(res.result.apiKey)
      }
      if (res.error) {
        toastStore.error(`Could get retrieve key: ${res.error}`)
      }
    },
    async generateApiKey(_, cb: (key: string) => void) {
      const res = await api.post('/user/config/generate-key')
      if (res.result) {
        cb(res.result.apiKey)
      }
      if (res.error) {
        toastStore.error(`Could get retrieve key: ${res.error}`)
      }
    },
    async getProfile() {
      const res = await usersApi.getProfile()
      if (res.error) return toastStore.error(`Failed to get profile`)
      if (res.result) {
        return { profile: res.result }
      }
    },

    async removeProfileAvatar() {
      const res = await usersApi.removeProfileAvatar()
      if (res.error) return toastStore.error(`Could not update profile: ${res.error}`)
      if (res.result) {
        return { profile: res.result }
      }
    },

    async getTiers({ user }) {
      const res = await api.get('/admin/tiers')
      if (res.result) {
        const sub = user ? getUserSubscriptionTier(user, res.result.tiers) : undefined
        return { tiers: res.result.tiers, sub }
      }
    },

    async *unlinkGoogleAccount(_, success?: () => void) {
      const res = await api.post('/user/unlink-google')
      if (res.result) {
        yield { user: res.result.user }
        toastStore.success('Google Account unlinked')
        return
      }

      toastStore.error(`Could not unlinked Google: ${res.error}`)
    },

    async *handleGoogleCallback(
      _,
      action: 'login' | 'link',
      data: { credential: string },
      success?: () => void
    ) {
      if (action !== 'login' && !isLoggedIn()) {
        toastStore.error(`Cannot link account: Not signed in`)
        return
      }
      yield { loading: true }

      const res = await api.post(action === 'link' ? '/user/link-google' : '/user/login/google', {
        token: data.credential,
      })

      yield { loading: false }

      switch (action) {
        case 'link': {
          if (res.result) {
            toastStore.success('Successfully linked Google account')
            yield { user: res.result.user }
            success?.()
            return
          }

          toastStore.error(`Could not link account: ${res.error}`)
          return
        }

        case 'login': {
          if (res.result) {
            yield {
              loggedIn: true,
              user: res.result.user,
              profile: res.result.profile,
              jwt: res.result.token,
              userType: getUserType(res.result.user),
            }
            setAuth(res.result.token)
            success?.()
            publish({ type: 'login', token: res.result.token })
            events.emit(EVENTS.loggedIn)
            return
          }

          toastStore.error(`Could not sign in: ${res.error}`)
        }
      }
    },

    async *startCheckout({ billingLoading }, tierId: string) {
      if (billingLoading) return
      yield { billingLoading: true }
      const callback = location.origin
      const res = await api.post(`/admin/billing/subscribe/checkout`, { tierId, callback })
      yield { billingLoading: false }
      if (res.result) {
        checkout(res.result.sessionUrl)
      }

      if (res.error) {
        toastStore.error(`Could not start checkout: ${res.error}`)
      }
    },
    async *finishCheckout(
      { user, billingLoading },
      sessionId: string,
      state: string,
      onSuccess?: Function
    ) {
      if (billingLoading) return
      yield { billingLoading: true }
      const res = await api.post(`/admin/billing/subscribe/finish`, { sessionId, state })
      yield { billingLoading: false }

      if (res.result && state === 'success') {
        onSuccess?.()
        return {
          user: { ...user!, sub: res.result, userLevel: res.result?.level ?? 0 },
        }
      }

      if (res.error) {
        toastStore.error(`Could not complete checkout: ${res.error}`)
      }
    },
    async *stopSubscription({ billingLoading }) {
      if (billingLoading) return
      yield { billingLoading: true }
      const res = await api.post('/admin/billing/subscribe/cancel')
      yield { billingLoading: false }
      if (res.result) {
        toastStore.normal('Subscription has been stopped')
        userStore.getConfig()
      }

      if (res.error) {
        toastStore.error(`Could not modify subsctiption: ${res.error}`)
      }
    },
    async *resumeSubscription({ billingLoading }) {
      if (billingLoading) return
      yield { billingLoading: true }
      const res = await api.post('/admin/billing/subscribe/resume')
      yield { billingLoading: false }
      if (res.result) {
        toastStore.success('Your subscription has been resumed!')
        userStore.getConfig()
      }

      if (res.error) {
        toastStore.error(`Could not resume subscription: ${res.error}`)
      }
    },

    async *modifySubscription({ billingLoading }, tierId: string) {
      if (billingLoading) return
      yield { billingLoading: true }
      const res = await api.post('/admin/billing/subscribe/modify', { tierId })
      yield { billingLoading: false }

      if (res.result) {
        toastStore.success('Your subscription has been changed')
        userStore.getConfig()
        userStore.subscriptionStatus()
      }

      if (res.error) {
        toastStore.error(`Could not change subscription: ${res.error}`)
      }
    },

    async *retrieveSubscription({ subLoading, tiers, sub: previous, user: last }, quiet?: boolean) {
      if (subLoading) return
      yield { subLoading: true }
      const res = await api.post('/admin/billing/subscribe/retrieve')
      yield { subLoading: false }

      if (res.result) {
        const next = getUserSubscriptionTier(res.result.user, tiers, previous)
        res.result.user.hordeKey = last?.hordeKey

        yield {
          user: res.result.user,
          sub: next,
          userLevel: res.result.user.sub?.level ?? next?.level ?? 0,
        }
      }

      if (quiet) return
      if (res.result) {
        toastStore.success('You are currently subscribed')
      }

      if (res.error) {
        toastStore.error(res.error)
      }
    },

    async *validateSubscription({ subLoading, tiers, sub: previous }, quiet?: boolean) {
      if (subLoading) return
      yield { subLoading: true }
      const res = await api.post('/admin/billing/subscribe/verify')
      yield { subLoading: false }

      if (res.result) {
        const next = getUserSubscriptionTier(res.result, tiers, previous)
        yield { user: res.result, sub: next, userLevel: next?.level ?? 0 }
      }

      if (quiet) return
      if (res.result) {
        toastStore.success('You are currently subscribed')
      }

      if (res.error) {
        toastStore.error(res.error)
      }
    },

    async subscriptionStatus() {
      if (!isLoggedIn()) return
      const res = await api.get('/admin/billing/subscribe/status')
      if (res.result) {
        return { subStatus: res.result }
      }
    },

    async getConfig() {
      const res = await usersApi.getConfig()

      if (res.error) return toastStore.error(`Failed to get user config`)
      if (res.result) {
        if (res.result.username) {
          storage.localSetItem(ACCOUNT_KEY, res.result.username)
        }
        window.usePipeline = res.result.useLocalPipeline
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

    async updateConfig({ user: prev }, config: ConfigUpdate) {
      const res = await usersApi.updateConfig(config)
      if (res.error) toastStore.error(`Failed to update config: ${res.error}`)
      if (res.result) {
        window.usePipeline = res.result.useLocalPipeline

        const prevLTM = prev?.disableLTM ?? true
        if (prevLTM && config.disableLTM === false) {
          embedApi.initSimiliary()
        }

        toastStore.success(`Updated settings`)
        return { user: res.result }
      }
    },

    async updatePartialConfig(_, config: ConfigUpdate, quiet?: boolean) {
      const res = await usersApi.updatePartialConfig(config)
      if (res.error) toastStore.error(`Failed to update config: ${res.error}`)
      if (res.result) {
        window.usePipeline = res.result.useLocalPipeline

        if (!quiet) {
          toastStore.success(`Updated settings`)
        }
        return { user: res.result }
      }
    },

    async updateService(_, service: AIAdapter, update: any, onDone?: (err?: any) => void) {
      const res = await usersApi.updateServiceConfig(service, update)
      if (res.error) {
        onDone?.(res.error)
        toastStore.error(`Failed to update service config: ${res.error}`)
        return
      }
      if (res.result) {
        toastStore.success('Updated service settings')
        onDone?.()
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

    async remoteLogin(_, onSuccess: (token: string) => void) {
      const res = await api.post('/user/login/callback')
      if (res.result) {
        onSuccess(res.result.token)
      }

      if (res.error) {
        toastStore.error(`Could not authenticate: ${res.error}`)
      }
    },

    async thirdPartyLogin(_, onSuccess: (token: string) => void) {
      const res = await api.post('/user/login/callback')
      if (res.result) {
        onSuccess(res.result.token)
      }

      if (res.error) {
        toastStore.error(`Could not authenticate: ${res.error}`)
      }
    },

    async verifyPatreon(_, body: any, onDone: (error?: any) => void) {
      const res = await api.post(`/user/verify/patreon`, body)
      if (res.result) {
        onDone()
        return
      }

      if (res.error) {
        onDone(res.error)
        return
      }
    },

    async unverifyPatreon() {
      const res = await api.post('/user/unverify/patreon')
      if (res.result) {
        toastStore.success('Unlinked Patreon account')
        userStore.getConfig()
        return
      }

      if (res.error) {
        toastStore.error(`Could not unlink Patreon account: ${res.error}`)
        return
      }
    },

    async *syncPatreonAccount({ sub: previous, tiers }, quiet?: boolean) {
      const res = await api.post('/user/resync/patreon')

      if (res.result) {
        yield { user: res.result }
      }

      if (quiet) return

      if (res.result) {
        toastStore.success('Successfully updated Patreon information')
        const sub = getUserSubscriptionTier(res.result, tiers, previous)
        return { user: res.result, sub }
      }

      if (res.error) {
        toastStore.error(`Could not sync Patreon info: ${res.error}`)
        return
      }

      userStore.getConfig()
    },

    async *login(_, username: string, password: string, onSuccess?: (token: string) => void) {
      yield { loading: true }

      const res = await api.post('/user/login', { username, password })
      yield { loading: false }
      if (res.error) {
        return toastStore.error(`Authentication failed`)
      }

      setAuth(res.result.token)
      storage.localSetItem(ACCOUNT_KEY, username)

      yield {
        loading: false,
        loggedIn: true,
        user: res.result.user,
        profile: res.result.profile,
        jwt: res.result.token,
        userType: getUserType(res.result.user),
      }

      if (res.result.user.ui) {
        yield { ui: res.result.user.ui }
      }

      onSuccess?.(res.result.token)
      publish({ type: 'login', token: res.result.token })
      events.emit(EVENTS.loggedIn)
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
        return toastStore.error(`Failed to register: ${res.error}`)
      }

      setAuth(res.result.token)

      yield {
        loggedIn: true,
        user: res.result.user,
        profile: res.result.profile,
        jwt: res.result.token,
      }

      onSuccess?.()
      publish({ type: 'login', token: res.result.token })
      events.emit(EVENTS.loggedIn)
    },
    async *logout() {
      clearAuth()
      storage.localRemoveItem(CACHED_SUB_KEY)
      publish({ type: 'logout' })
      const ui = getUIsettings(true)

      yield {
        jwt: '',
        profile: undefined,
        user: undefined,
        loggedIn: false,
        showProfile: false,
        ui,
      }
      events.emit(EVENTS.loggedOut)
    },

    async *deleteAccount() {
      const res = await api.method('delete', '/user/my-account')
      if (res.result) {
        toastStore.error('Account deleted')
        userStore.logout()
      }

      if (res.error) {
        toastStore.error(`Could not delete account: ${res.error}`)
      }
    },

    async saveUI({ ui }, update: Partial<UI.UISettings>) {
      // const mode = update.mode ? update.mode : ui.mode
      const next: UI.UISettings = { ...ui, ...update }
      const mode = next.mode
      const current = next[next.mode]

      await usersApi.updateUI({ ...next, [mode]: current })

      try {
        await updateTheme({ ...next, [mode]: current })
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
        await updateTheme(next)
      } catch (e: any) {
        toastStore.error(`Failed to save UI settings: ${e.message}`)
      }

      return { ui: next, current }
    },

    async tryCustomUI({ ui }, update: Partial<UI.CustomUI>) {
      const prop = ui.mode === 'light' ? 'light' : 'dark'
      const current = { ...ui[prop], ...update }
      const next = { ...ui, current, [prop]: current }
      await updateTheme(next)
      return next
    },

    tryUI({ ui }, update: Partial<UI.UISettings>) {
      const mode = update.mode || ui.mode
      const current = ui[mode]
      const next = { current, ...ui, ...update }
      debouceUI(next)
      return { ui: next }
    },

    async receiveUI({ ui }, update: UI.UISettings) {
      const current = update[update.mode]
      await updateTheme(update)

      const keys = Object.keys(defaultUIsettings.msgOptsInline) as UI.MessageOption[]

      for (const key in defaultUIsettings) {
        if (key in update === false) {
          const prop = key as keyof UISettings
          update[prop] = defaultUIsettings[prop] as never // ...?
        }
      }

      for (const key of keys) {
        if (!update.msgOptsInline[key]) {
          update.msgOptsInline[key] = { ...defaultUIsettings.msgOptsInline[key] }
        }

        if (!defaultUIsettings.msgOptsInline[key]) {
          delete update.msgOptsInline[key]
        }
      }

      return { ui: { ...ui, ...update }, current }
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
      kind:
        | 'novel'
        | 'horde'
        | 'openai'
        | 'scale'
        | 'claude'
        | 'third-party'
        | 'elevenlabs'
        | 'mistral'
        | 'featherless'
        | 'arli'
    ) {
      const res = await usersApi.deleteApiKey(kind)
      if (res.error) return toastStore.error(`Failed to update settings: ${res.error}`)

      if (!user) return
      toastStore.success('Key removed')
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

      if (kind === 'openai') {
        return { user: { ...user, oaiKey: '', oaiKeySet: false } }
      }

      if (kind === 'mistral') {
        return { user: { ...user, mistralKey: '', mistralKeySet: false } }
      }

      if (kind === 'featherless') {
        return { user: { ...user, featherlessApiKey: '', featherlessApiKeySet: false } }
      }

      if (kind === 'arli') {
        return { user: { ...user, arliApiKey: '', arliApiKeySet: false } }
      }
    },

    async clearGuestState() {
      try {
        const chats = await localApi.loadItem('chats')
        for (const chat of chats) {
          storage.removeItem(`messages-${chat._id}`)
        }

        for (const key in localApi.KEYS) {
          await storage.removeItem(key)
          await localApi.loadItem(key as any)
        }

        toastStore.error(`Guest state successfully reset`)
        userStore.logout()
      } catch (e: any) {
        toastStore.error(`Failed to reset guest state: ${e.message}`)
      }
    },

    async novelLogin(_, key: string, onComplete: (err?: boolean) => void) {
      const res = await usersApi.novelLogin(key)
      if (res.result) {
        toastStore.success('Successfully authenticated with NovelAI')
        onComplete()
        return { user: res.result }
      }

      if (res.error) {
        onComplete(true)
        toastStore.error(`NovelAI login failed: ${res.error}`)
      }
    },

    async createApiKey(_, cb: (err: any, code?: string) => void) {
      const res = await api.post('/user/code')
      if (res.result) {
        cb(null, res.result.code)
      }

      if (res.error) {
        cb(res.error)
      }
    },

    async *hordeStats({ metadata, user }) {
      yield { hordeStatsLoading: true }
      const res = await api.post('/user/services/horde-stats', { key: user?.hordeKey })
      yield { hordeStatsLoading: false }
      if (res.error) {
        toastStore.error(`Could not retrieve usage: ${res.error}`)
        yield { metadata: { ...metadata, openaiUsage: -1 } }
      }

      if (res.result) {
        if (res.result.error) {
          toastStore.warn(`Could not retrieve Horde stats: ${res.result.error}`)
          return
        }

        yield {
          metadata: {
            ...metadata,
            hordeStats: res.result.user,
          },
        }
      }
    },
  }
})

userStore.subscribe((nextState) => {
  if (!nextState.sub) {
    return
  }

  storage.localSetItem(CACHED_SUB_KEY, JSON.stringify(nextState.sub))
})

function init(): UserState {
  const existing = getAuth()

  try {
    storage.test()
  } catch (e: any) {
    toastStore.error(`localStorage unavailable: ${e.message}`)
  }

  const ui = getUIsettings()
  updateTheme(ui)

  if (!existing) {
    return {
      userType: undefined,
      userLevel: -1,
      loading: false,
      jwt: '',
      loggedIn: false,
      ui,
      background: undefined,
      oaiUsageLoading: false,
      hordeStatsLoading: false,
      metadata: {},
      current: ui[ui.mode] || UI.defaultUIsettings[ui.mode],
      showProfile: false,
      tiers: [],
      billingLoading: false,
      subLoading: false,
    }
  }

  const cachedSub = storage.localGetItem(CACHED_SUB_KEY)

  return {
    userType: undefined,
    userLevel: 0,
    loggedIn: true,
    loading: false,
    jwt: existing,
    ui,
    background: undefined,
    oaiUsageLoading: false,
    hordeStatsLoading: false,
    metadata: {},
    current: ui[ui.mode] || UI.defaultUIsettings[ui.mode],
    showProfile: false,
    tiers: [],
    billingLoading: false,
    subLoading: false,
    sub: cachedSub ? JSON.parse(cachedSub) : undefined,
  }
}

async function updateTheme(ui: UI.UISettings) {
  storage.localSetItem(getUIKey(), JSON.stringify(ui))
  const root = document.documentElement

  const mode = ui[ui.mode]

  const hex = mode.bgCustom || getSettingColor('--bg-800')
  const colors = mode.bgCustom
    ? new Values(`${hex}`)
        .all(14)
        .map(({ hex }) => '#' + hex)
        .reverse()
    : []

  if (ui.mode === 'dark') {
    colors.reverse()
  }

  const gradients = ui.bgCustomGradient ? getColorShades(ui.bgCustomGradient) : []

  const notifies = Object.entries({
    info: 'sky',
    success: 'green',
    warning: 'premium',
    error: 'red',
  })

  for (let shade = 100; shade <= 1000; shade += 100) {
    const index = shade / 100 - 1
    const num = ui.mode === 'light' ? 1000 - shade : shade

    if (shade <= 900) {
      for (const [notify, source] of notifies) {
        const color = getRootVariable(`--${source}-${num}`)
        root.style.setProperty(`--${notify}-${num}`, color)
      }

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
  setRootVariable('text-quote-color', getSettingColor(mode.chatQuoteColor || 'text-800'))
  setRootVariable('bot-background', getSettingColor(mode.botBackground || 'bg-800'))
  root.style.setProperty(`--sitewide-font`, fontFaces[ui.font])
}

function getUIsettings(guest = false) {
  const key = getUIKey(guest)
  const json =
    storage.localGetItem(key) ||
    storage.localGetItem('ui-settings') ||
    JSON.stringify(UI.defaultUIsettings)

  const settings: UI.UISettings = JSON.parse(json)
  const theme = (storage.localGetItem('theme') || settings.theme) as UI.ThemeColor
  storage.removeItem('theme')

  if (theme && UI.UI_THEME.includes(theme)) {
    settings.theme = theme
  }

  const ui = { ...UI.defaultUIsettings, ...settings }

  if (!ui.dark.chatEmphasisColor) {
    ui.dark.chatQuoteColor = UI.defaultUIsettings.dark.chatQuoteColor
    ui.light.chatQuoteColor = UI.defaultUIsettings.light.chatQuoteColor
  }

  if (!ui.msgOptsInline) {
    ui.msgOptsInline = UI.defaultUIsettings.msgOptsInline
  }

  return ui
}

async function setBackground(content: any) {
  if (content === null) {
    await storage.removeItem(BACKGROUND_KEY)
    return
  }

  await storage.setItem(BACKGROUND_KEY, content)
}

function getUIKey(guest = false) {
  const userId = guest ? 'anon' : getUserId()
  return `ui-settings-${userId}`
}

subscribe('ui-update', { ui: 'any' }, (body) => {
  userStore.receiveUI(body.ui)
})

events.on(EVENTS.tierReceived, (tier: AppSchema.SubscriptionTier) => {
  const { tiers } = userStore.getState()
  const existing = tiers.some((t) => t._id === tier._id)

  const next = existing ? tiers.map((t) => (t._id === tier._id ? tier : t)) : tiers.concat(tier)

  userStore.setState({ tiers: next })
})

async function checkout(sessionUrl: string) {
  const child = window.open(
    sessionUrl,
    `_blank`,
    `width=600,height=1080,scrollbar=yes,top=100,left=100`
  )!

  let success = false
  const interval = setInterval(() => {
    try {
      if (child.closed) {
        clearInterval(interval)
        if (success) {
          userStore.getConfig()
          events.emit('checkout-success', true)
          toastStore.success('Subscription successful!')
        }
        return
      }

      const path = child.location.pathname
      if (!path.includes('/checkout')) return

      const result = path.includes('/success')
      success = result
    } catch (ex) {}
  })

  setTimeout(() => {
    if (!child) {
      toastStore.error(
        'Popups are required to open the checkout window. Please check your browser settings.'
      )
      clearInterval(interval)
    }
  }, 3000)
}

function getUserType(user: AppSchema.User): UserType {
  if (user.admin) return 'admins'
  if (user.role === 'admin') return 'admins'
  if (user.role === 'moderator') return 'moderators'
  if (user.sub?.level && user.sub.level > 0) return 'subscribers'
  if (user._id === 'anon') return 'guests'
  return 'users'
}
