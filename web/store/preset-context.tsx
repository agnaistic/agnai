import { SetStoreFunction, createStore } from 'solid-js/store'
import { AIAdapter, MODE_SETTINGS, PresetAISettings, ThirdPartyFormat } from '/common/adapters'
import { AppSchema } from '/common/types'
import { SubscriptionModelOption } from '/common/types/presets'
import { agnaiPresets } from '/common/presets/agnaistic'
import { createContext, createEffect, createSignal, on, useContext } from 'solid-js'
import { getStore } from '/web/store/create'
import { getPresetConnection, PresetConnection, ProviderDefinition } from '/common/providers'
import { defaultPresets, isDefaultPreset } from '/common/default-preset'
import { ADAPTER_SETTINGS } from '../shared/PresetSettings/settings'
import { isValidServiceSetting } from '../shared/util'
import { toastStore } from './toasts'
import { presetApi } from './data/presets'
import { deepClone, inline } from '/common/util'
import { getFallbackPreset } from '/common/presets'
import { settingStore } from './settings'
import { userStore } from './user'
import { debug } from '/common/debug'
import { getRemotePreset, presetStore } from './presets'
import { chatStore } from './chat'
import { v4 } from 'uuid'
import { prepareTokenizer } from '/common/tokenize'

export type PresetProps = {
  state: ContextPreset
  setters: PresetFuncs
  page?: string

  disabled?: boolean
  //   service?: AIAdapter
  hideTabs?: PresetTab[]
}

export type PresetTab = 'General' | 'Prompt' | 'Memory' | 'Samplers' | 'Toggles'

export type PresetTabProps = {
  state: ContextPreset
  setters: PresetFuncs
  sub: SubscriptionModelOption | undefined
  tab: string
  page: string | undefined
}

export type ContextPreset = Omit<AppSchema.SubscriptionModel, 'kind'> & {
  userId?: string
  disabled?: boolean
}

export type HideState = ReturnType<typeof usePresetContext>[0]['hides']

export type SetPresetState = SetStoreFunction<ContextPreset>

export function getPresetForm(state: ContextPreset) {
  const {
    disabled,
    subApiKey,
    subDisabled,
    subLevel,
    subModel,
    subApiKeySet,
    subServiceUrl,
    allowGuestUsage,
    levels,
    ...form
  } = state
  return form
}

export function getSubPresetForm(state: ContextPreset) {
  const { disabled, subApiKeySet, ...form } = state

  return { ...form, kind: 'subscription-setting' as const }
}

const initPreset = (): ContextPreset => ({
  _id: '',
  ...agnaiPresets.agnai,
  reasoning: { enabled: false, effort: 'medium', exclude: true, start: '', end: '', maxTokens: 0 },
  stopSequences: [],
  description: '',
  name: '',
  subLevel: -1,
  subApiKey: '',
  levels: [],
  subDisabled: false,
  subModel: '',
  userId: '',
  allowGuestUsage: false,
  disabled: false,
  xtcThreshold: 0,
  xtcProbability: 0,
  dryAllowedLength: 2,
  dryBase: 1.75,
  dryMultiplier: 0,
  drySequenceBreakers: [],
  modelFormat: 'None',
  providerId: '',
  subVisionModel: false,
  isDefaultSub: false,
  subServiceUrl: 'https://',
  providerModels: {},
  tokenizer: '',
  registered: {},
  postUserRole: false,
})

const initContext = (id?: string): PresetContext => ({
  __: id || v4().slice(0, 4),
  url: '',
  loading: false,
  list: [],
  data: [],
  providerId: '',
  hides: {},

  current: initPreset(),
  json: undefined,
  summary: undefined,
  chargen: undefined,
})

const noopModels: SetStoreFunction<PresetContext> = (...args: any[]) => {}

const Context = createContext([initContext('global'), noopModels] as const)

export type PresetContext = {
  __: string
  list: string[]
  url: string
  loading: boolean
  data: any[]
  providerId: string
  provider?: AppSchema.Provider
  service?: AIAdapter
  format?: ThirdPartyFormat
  detail?: ProviderDefinition
  attachments?: boolean
  sub?: SubscriptionModelOption
  hides: { [key in keyof AppSchema.GenSettings]?: boolean }

  current: ContextPreset
  json: AppSchema.UserGenPreset | undefined
  summary: AppSchema.UserGenPreset | undefined
  chargen: AppSchema.UserGenPreset | undefined
}

export function PresetStateProvider(props: { children: any }) {
  const [context, setContext] = createStore(initContext())

  return <Context.Provider value={[context, setContext]}>{props.children}</Context.Provider>
}

export type PresetFuncs = ReturnType<typeof usePresetContext>[1]

export function usePresetContext(opts?: { anonymous: boolean }) {
  const cfg = settingStore((s) => ({ config: s.config }))
  const user = userStore((s) => ({ user: s.user }))
  const presets = presetStore((s) => ({ list: s.presets, loaded: s.presetsLoaded }))
  const chats = chatStore((s) => ({ details: s.details, lastChatId: s.lastChatId }))

  const [failedChatId, setFailedChatId] = createSignal('')

  const [context, setContext] = opts?.anonymous ? createStore(initContext()) : useContext(Context)

  const setState: SetStoreFunction<ContextPreset> = (...args: any[]) => {
    const [first, second] = args
    if (args.length === 1) {
      setContext({ current: { ...context.current, ...first } })
    } else {
      const update = { [first]: second }
      setContext({ current: { ...context.current, ...update } })
    }
  }

  const log = (...args: any[]) =>
    debug(`preset[${context.current._id ? context.current._id.slice(0, 4) : '....'}]`).apply(
      null,
      args as any
    )

  // Always clear the loading flag
  if (!opts?.anonymous) {
    setContext('loading', false)
  }

  const onStateUpdated = (source: string) => {
    if (context.current.providerId && context.provider?._id === context.current.providerId) {
      log('state updated cancelled %s', context.current.providerId)
      return
    }

    const list = user.user?.providers

    const conn = getPresetConnection(context.current, list)

    log(
      '[%s:%s] changing provider FROM:%s --> TO:%s (CONN:%s)',
      context.__,
      source,
      context.provider?._id?.slice(0, 4) || 'nil',
      context.current.providerId?.slice(0, 4) || 'nil',
      conn.provider?._id?.slice(0, 4) || 'nil'
    )
    const subId =
      conn.preset?.providerModels?.agnaistic || conn.preset?.registered?.agnaistic?.subscriptionId

    const subModel = subId ? cfg.config.subs.find((s) => s._id === subId) : undefined
    const attachments = canAttachImage(conn, subModel)

    setContext({
      provider: conn.provider,
      service: conn.service,
      format: conn.format,
      detail: conn.detail,
      sub: subModel,
      attachments,
    })

    const hides = createHides(context.current, conn)
    setContext('hides', hides)
  }

  const assignTaskPresets = () => {
    log('json %s, presets: #%s', user.user?.jsonPreset, presets.list.length)
    setContext({
      json: maybeDeepClone(presets.list.find((p) => p._id === user.user?.jsonPreset)),
      summary: maybeDeepClone(presets.list.find((p) => p._id === user.user?.summaryPreset)),
      chargen: maybeDeepClone(presets.list.find((p) => p._id === user.user?.chargenPreset)),
    })
  }

  createEffect(
    () => [
      user.user?.jsonPreset,
      user.user?.summaryPreset,
      user.user?.chargenPreset,
      presets.list.length,
    ],
    assignTaskPresets
  )

  createEffect(
    on(
      () => [failedChatId(), chats.details],
      () => {
        if (!failedChatId()) return

        const detail = chats.details[failedChatId()]

        log('skipped post-failure (detail not ready yet)')
        if (!detail?.chat) return

        log('loading after failure (chat now ready)')
        loadChat(detail.chat)
      }
    )
  )

  createEffect(
    on(
      () => [context.sub?.preset.tokenizer, context.current.tokenizer],
      () => {
        const tokenizer = context.sub?.preset.tokenizer || context.current.tokenizer

        if (tokenizer) {
          prepareTokenizer(tokenizer)
        }
      }
    )
  )

  const loadChatId = async (chatId: string, knownPresetId?: string) => {
    try {
      if (knownPresetId) {
        if (isDefaultPreset(knownPresetId)) {
          await loadPresetId(knownPresetId)
          return
        }

        const result = await loadPresetId(knownPresetId)
        if (result) return
      }

      const result = await presetApi.getChatPreset(chatId)
      if (result.result) {
        load(result.result)
        return
      }

      if (result.error) {
        if (result.error === 'Resource not found') {
          setFailedChatId(chatId)
        } else {
          toastStore.error(result.error)
        }
      }

      const fallback = getFallbackPreset('agnaistic')
      load(fallback)
    } catch (ex) {
    } finally {
      log('loaded by chat-id')
      loadModels()
    }
  }

  const loadChat = async (chat: AppSchema.Chat, alert?: boolean) => {
    const expectingUserPreset = !!chat.genPreset && !isDefaultPreset(chat.genPreset)
    if (chat.genPreset && context.current._id === chat.genPreset) {
      log(`load-by-chat called --> preset already loaded`)
      return
    }

    log(
      `load-by-chat called %s`,
      inline({
        c: chat._id?.slice(0, 4),
        p: chat.genPreset ? chat.genPreset?.slice(0, 4) : 'no-id',
      })
    )

    let preset = await loadPresetId(chat.genPreset || '', alert)
    loadModels()
    onStateUpdated('load-chat')

    if (expectingUserPreset && chat.genPreset === preset._id) {
      log('load-by-chat success')
      return
    }

    if (chat?._id && !chat.genPreset && preset?._id) {
      // If the chat has no preset configured, we need to assign one
      getStore('chat').assignChatPreset(chat._id, preset._id, () => {
        if (isDefaultPreset(preset._id)) return
        toastStore.info('Assigned preset to chat')
      })
    }
  }

  const loadPresetId = async (presetId: string, alert?: boolean) => {
    if (!presetId) {
      const fallback = getFallbackPreset('agnaistic') as Partial<AppSchema.UserGenPreset>
      await load({ ...fallback, _id: 'agnai' })
      return { ...fallback, _id: 'agnai' }
    }

    if (isDefaultPreset(presetId)) {
      const fallback = { _id: presetId, ...deepClone(defaultPresets[presetId]) }
      await load(fallback)
      return fallback
    }

    let preset = presets.list.find((p) => p._id === presetId)

    /**
     * Load from the cache first to speed things up
     * Then fetch the real preset
     */
    if (preset) {
      await load(preset)
    }

    const remote = await getRemotePreset(presetId)
    if (remote?.result) {
      await load(remote.result)
      return remote.result
    }

    if (preset) return preset

    // if (alert) {
    //   toastStore.warn('Could not load your preset - Ensure your chat has a preset assigned')
    // }

    const fallback = getFallbackPreset('agnaistic') as Partial<AppSchema.UserGenPreset>
    await load({ ...fallback, _id: 'agnai' })
    return { ...fallback, _id: 'agnai' }
  }

  const changeProvider = async (providerId: string, save?: boolean) => {
    if (save) {
      setState({ providerId })
      onStateUpdated('provider-save')

      await Promise.all([
        loadModels({}),
        updateAndSave(
          { providerId },
          {
            quiet: true,
            onSuccess: () => {
              getStore('toasts').success('Provider changed')
            },
          }
        ),
      ])

      return
    }

    setState({ providerId })
    onStateUpdated('provider-nosave')
    loadModels({})
  }

  const load = async (preset: Partial<AppSchema.UserGenPreset> | undefined) => {
    assignTaskPresets()
    setState({ providerId: '', thirdPartyKeySet: false, providerModels: {}, ...preset })
    await loadModels({ preset })
    onStateUpdated('load')
  }

  const loadModels = async (opts?: {
    preset?: Partial<AppSchema.GenSettings>
    force?: boolean
  }) => {
    const providerId = opts?.preset ? opts.preset.providerId : context.current.providerId

    if (!providerId) {
      log('models cancelled: no provider id')
      return
    }

    if (context.loading) {
      log('models cancelled: loading')
      return
    }
    if (context.providerId === providerId && !opts?.force) {
      log(
        'models cancelled: provider id (%s) #%s/#%s',
        providerId,
        context.list.length,
        context.data.length
      )
      return
    }
    if (providerId) {
      setContext({ providerId })
    }

    setContext('loading', true)

    try {
      const list = await presetApi.getModelListByPreset(
        opts?.preset || context.current,
        opts?.force
      )
      if (list) {
        log(
          'models success: %s [%s]',
          list?.list.length,
          `${!!opts?.force === true ? 'true' : 'false'}`
        )
        setContext({
          list: list?.list || [],
          data: list?.data || [],
          url: list.url,
        })

        if (opts?.preset) {
          setContext('providerId', opts.preset.providerId || '')
        }
      }
    } catch (ex) {
      setContext('loading', false)
    } finally {
      setContext('loading', false)
    }
  }

  const clear = () => {
    setState({ ...initPreset() })
  }

  const upsert = async (opts?: {
    quiet?: boolean
    onCreated?: (preset: AppSchema.UserGenPreset) => void
    onUpdated?: (preset: AppSchema.UserGenPreset) => void
  }) => {
    const form = getPresetForm(context.current)
    if (context.current._id && !isDefaultPreset(context.current._id)) {
      getStore('presets').updatePreset(context.current._id, form, {
        quiet: opts?.quiet,
        onSuccess: opts?.onUpdated,
      })
      return
    }

    getStore('presets').createPreset(form, async (created) => {
      if (!created) return
      await load(created)
      opts?.onCreated?.(created)
    })
  }

  const updateAndSave = async (
    update: Partial<ContextPreset>,
    opts?: {
      quiet?: boolean
      onSuccess?: (preset: AppSchema.GenSettings) => void
    }
  ) => {
    if (
      !context.current._id ||
      context.current._id === 'new' ||
      isDefaultPreset(context.current._id)
    )
      return

    getStore('presets').updatePreset(context.current._id, update, {
      quiet: opts?.quiet,
      onSuccess: (next) => {
        opts?.onSuccess?.(next)
      },
    })
  }

  const change = async (opts: { chatId: string; presetId: string; onSuccess?: () => void }) => {
    const preset = presets.list.find((p) => p._id === opts.presetId)

    chatStore.assignChatPreset(opts.chatId, opts.presetId, async () => {
      if (preset) {
        log('assigned existing preset')
        await load(preset)
        onStateUpdated('change-exist')
        return
      }

      log('assigning unavailable preset')
      await loadPresetId(opts.presetId)
      onStateUpdated('change-unavail')
    })
  }

  return [
    context,
    {
      context,
      setState,
      provider: changeProvider,
      load: loadPresetId,
      loadChatId,
      loadChat,
      clear,
      upsert,
      update: updateAndSave,

      refreshModels: (force?: boolean) => loadModels({ force }),
      change,
    },
  ] as const
}

export function getProvider(id: string | undefined) {
  if (!id || id === 'agnaistic') return

  const providers = getStore('user').getState().user?.providers || []
  const match = providers.find((p) => p._id === id)
  return match
}

function createHides(store: ContextPreset, ctx: PresetConnection) {
  const keys = Object.keys(ADAPTER_SETTINGS) as Array<keyof AppSchema.GenSettings>
  let hides: { [key in keyof AppSchema.GenSettings]?: boolean } = {}

  for (const key of keys) {
    const hide = hidePresetSetting(
      { service: ctx.service, thirdPartyFormat: ctx.format, presetMode: store.presetMode },
      key as any
    )
    hides[key] = hide
  }

  if (store.providerId) {
    hides.thirdPartyUrl = true
    hides.thirdPartyFormat = true
    hides.thirdPartyKey = true
    hides.thirdPartyUrlNoSuffix = true
  }

  return hides
}

function maybeDeepClone(obj: any | undefined) {
  if (!obj) return undefined

  return deepClone(obj)
}

function hidePresetSetting(
  state: Pick<ContextPreset, 'service' | 'thirdPartyFormat' | 'presetMode'>,
  prop?: keyof PresetAISettings
) {
  let hide = false
  if (!prop) {
    hide = false
  } else if (!isValidServiceSetting(state, prop)) {
    hide = true
  } else if (state.presetMode && state.presetMode !== 'advanced') {
    const enabled = MODE_SETTINGS[state.presetMode]?.[prop]
    if (!enabled) {
      hide = true
    }
  }

  return hide
}

function canAttachImage(
  conn: PresetConnection | undefined,
  subModel: AppSchema.SubscriptionModelOption | undefined
) {
  if (!conn) return false

  debug('attach')('service: %s | format: %s', conn.service, conn.format)

  if (conn.service === 'openrouter') return true
  if (conn.service === 'claude-v2') return true
  if (conn.service === 'agnaistic') {
    if (!subModel) return false
    return !!subModel.preset.subVisionModel
  }

  const supportedFormats: { [key in ThirdPartyFormat]?: boolean } = {
    'openai-chat': true,
    'openai-chatv2': true,
    llamacpp: true,
    ollama: true,
    gemini: true,
    vllm: true,
    aphrodite: true,
    tabby: true,
    featherless: true,
    arli: true,
    claude: true,
    mistral: true,
    koboldcpp: true,
    'lm-studio': true,
  }

  return !!conn.format && !!supportedFormats[conn.format]
}
