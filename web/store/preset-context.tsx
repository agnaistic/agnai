import { SetStoreFunction, createStore } from 'solid-js/store'
import { AIAdapter, MODE_SETTINGS, PresetAISettings, ThirdPartyFormat } from '/common/adapters'
import { AppSchema } from '/common/types'
import { SubscriptionModelOption } from '/common/types/presets'
import { agnaiPresets } from '/common/presets/agnaistic'
import { createContext, createEffect, createSignal, on, useContext } from 'solid-js'
import { getStore } from '/web/store/create'
import { getPresetConnection, ProviderDefinition } from '/common/providers'
import { defaultPresets, isDefaultPreset } from '/common/default-preset'
import { ADAPTER_SETTINGS } from '../shared/PresetSettings/settings'
import { isValidServiceSetting } from '../shared/util'
import { toastStore } from './toasts'
import { presetApi } from './data/presets'
import { deepClone, inline } from '/common/util'
import { getFallbackPreset } from '/common/presets'
import { settingStore } from './settings'
import { userStore } from './user'

export type PresetProps = {
  state: PresetState
  setters: PresetFuncs
  page?: string

  disabled?: boolean
  //   service?: AIAdapter
  hideTabs?: PresetTab[]
}

export type PresetTab = 'General' | 'Prompt' | 'Memory' | 'Samplers' | 'Toggles'

export type PresetTabProps = {
  state: PresetState
  setters: PresetFuncs
  sub: SubscriptionModelOption | undefined
  tab: string
  page: string | undefined
}

export type PresetState = Omit<AppSchema.SubscriptionModel, 'kind'> & {
  userId?: string
  disabled?: boolean
}

export type HideState = ReturnType<typeof usePresetContext>[1]['hides']

export type SetPresetState = SetStoreFunction<PresetState>

export function getPresetForm(state: PresetState) {
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

export function getSubPresetForm(state: PresetState) {
  const { disabled, subApiKeySet, ...form } = state

  return { ...form, kind: 'subscription-setting' as const }
}

export const initPreset = (): Omit<AppSchema.SubscriptionModel, 'kind'> & {
  userId: string
  disabled: boolean
} => ({
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
})

const initModels = (): ModelState => ({
  url: '',
  loading: false,
  list: [],
  data: [],
  providerId: '',
})

const noopPreset: SetStoreFunction<PresetState> = (...args: any[]) => {}
const noopModels: SetStoreFunction<ModelState> = (...args: any[]) => {}

const PresetContext = createContext([initPreset(), noopPreset, initModels(), noopModels] as const)

type ModelState = { list: string[]; url: string; loading: boolean; data: any[]; providerId: string }

export function PresetStateProvider(props: { children: any }) {
  const [store, setStore] = createStore(initPreset())
  const [models, setModels] = createStore(initModels())

  return (
    <PresetContext.Provider value={[store, setStore, models, setModels]}>
      {props.children}
    </PresetContext.Provider>
  )
}

export type PresetFuncs = ReturnType<typeof usePresetContext>[1]

export function usePresetContext(opts?: { anonymous: boolean }) {
  const cfg = settingStore()
  const user = userStore()

  const [state, setState, models, setModels] = opts?.anonymous
    ? [...createStore(initPreset()), ...createStore(initModels())]
    : useContext(PresetContext)

  const [context, setContext] = createStore<PresetContext>({})
  const [hides, setHides] = createStore(createHides(state, context))
  const [attemptedId, setAttemptedId] = createSignal('')

  createEffect(
    on(
      () => ({ id: state._id, providerId: state.providerId, list: user.user?.providers }),
      () => runStateUpdate('state')
    )
  )

  const runStateUpdate = (source: string) => {
    const list = user.user?.providers

    const subId = state?.providerModels?.agnaistic || state?.registered?.agnaistic?.subscriptionId

    const conn = getPresetConnection(state, list)
    const subModel = subId ? undefined : cfg.config.subs.find((s) => s._id === subId)
    const attachments = canAttachImage(conn, subModel)

    setContext({ ...conn, sub: subModel, attachments })

    const hides = createHides(state, conn)
    setHides(hides)
  }

  const loadChat = async (chat: AppSchema.Chat) => {
    const stack = new Error()
    const expectingUserPreset = !!chat.genPreset && !isDefaultPreset(chat.genPreset)
    console.log(
      `[p_ctx] load-by-chat called\n${inline({
        c: chat._id?.slice(0, 8),
        p: chat.genPreset ? chat.genPreset?.slice(0, 8) : 'no-id',
      })}`,
      stack.stack
    )

    if (chat.genPreset && chat.genPreset === state._id) {
      console.log(`[p_ctx] preset already loaded`)
      return
    }

    let preset = await loadPresetId(chat.genPreset || '')

    if (expectingUserPreset && preset._id !== chat.genPreset) {
      return
    }

    // If the chat has no preset configured, we need to assign one
    if (chat?._id && !chat.genPreset && preset?._id) {
      getStore('chat').assignChatPreset(chat._id, preset._id, () =>
        toastStore.info('Assigned preset to chat')
      )
    }
  }

  const loadPresetId = async (presetId: string) => {
    console.log('[p_ctx] load-by-id called')

    if (isDefaultPreset(presetId)) {
      const fallback = { _id: presetId, ...deepClone(defaultPresets[presetId]) }
      load(fallback)
      return fallback
    }

    const presets = getStore('presets').getState().presets
    let preset = presets.find((p) => p._id === presetId)

    if (!preset && presetId) {
      const remote = await presetApi.getPreset(presetId)
      if (remote?.result) {
        load(remote.result)
        return remote.result
      }

      if (attemptedId() !== presetId) {
        setAttemptedId(presetId)
        toastStore.warn('Could not load your preset - Ensure your chat has a preset assigned')
      }
    }

    if (!preset) {
      if (presetId) {
      }

      const fallback = getFallbackPreset('agnaistic') as Partial<AppSchema.UserGenPreset>
      load({ ...fallback, _id: '' })
      return fallback
    }

    load(preset)
    return preset
  }

  const load = (preset: Partial<AppSchema.UserGenPreset> | undefined) => {
    setState({ providerId: '', thirdPartyKeySet: false, providerModels: {}, ...preset })
    loadModels({ preset })
  }

  const loadModels = async (opts?: {
    preset?: Partial<AppSchema.GenSettings>
    force?: boolean
  }) => {
    if (models.loading) return
    if (models.providerId === state.providerId && !opts?.force) return
    if (opts?.preset?.providerId) {
      setModels({ providerId: opts.preset.providerId })
    }

    setModels('loading', true)

    try {
      const list = await presetApi.getModelListByPreset(opts?.preset || state, opts?.force)
      if (list) {
        setModels({
          list: list?.list || [],
          data: list?.data || [],
          url: list.url,
        })

        if (opts?.preset) {
          setModels('providerId', opts.preset.providerId || '')
        }
      }
    } finally {
      setModels('loading', false)
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
    const form = getPresetForm(state)
    if (state._id && !isDefaultPreset(state._id)) {
      getStore('presets').updatePreset(state._id, form, {
        quiet: opts?.quiet,
        onSuccess: opts?.onUpdated,
      })
      return
    }

    getStore('presets').createPreset(form, (created) => {
      if (!created) return
      load(created)
      opts?.onCreated?.(created)
    })
  }

  const updateAndSave = async (
    update: Partial<PresetState>,
    opts?: {
      quiet?: boolean
      onSuccess?: (preset: AppSchema.GenSettings) => void
    }
  ) => {
    if (!state._id || state._id === 'new' || isDefaultPreset(state._id)) return

    getStore('presets').updatePreset(state._id, update, {
      quiet: opts?.quiet,
      onSuccess: (next) => {
        opts?.onSuccess?.(next)
      },
    })
  }

  createEffect(() => {
    const id = state._id.slice(0, 5)
    const modelId = state.providerModels?.agnaistic || 'none'
    const isdef = isDefaultPreset(state._id)
    console.log(`[agnai:${id}]`, modelId, isdef ? 'true' : 'false')
  })

  return [
    state,
    {
      models,
      setState,
      load: loadPresetId,
      loadChat,
      clear,
      upsert,
      update: updateAndSave,

      refreshModels: (force?: boolean) => loadModels({ force }),
      hides: hides,
      context: context,
    },
  ] as const
}

export function getProvider(id: string | undefined) {
  if (!id || id === 'agnaistic') return

  const providers = getStore('user').getState().user?.providers || []
  const match = providers.find((p) => p._id === id)
  return match
}

export type PresetContext = {
  provider?: AppSchema.Provider
  service?: AIAdapter
  format?: ThirdPartyFormat
  detail?: ProviderDefinition
  attachments?: boolean
  sub?: SubscriptionModelOption
}

function createHides(store: PresetState, ctx: PresetContext) {
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

function hidePresetSetting(
  state: Pick<PresetState, 'service' | 'thirdPartyFormat' | 'presetMode'>,
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
  conn: PresetContext | undefined,
  subModel: AppSchema.SubscriptionModelOption | undefined
) {
  if (!conn) return false
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
  }

  return !!conn.format && !!supportedFormats[conn.format]
}
