import { SetStoreFunction, createStore } from 'solid-js/store'
import { AIAdapter, MODE_SETTINGS, PresetAISettings, ThirdPartyFormat } from '/common/adapters'
import { AppSchema } from '/common/types'
import { SubscriptionModelOption } from '/common/types/presets'
import { agnaiPresets } from '/common/presets/agnaistic'
import { createContext, createEffect, on, useContext } from 'solid-js'
import { getStore } from '/web/store/create'
import { getPresetConnection } from '/common/providers'
import { defaultPresets, isDefaultPreset } from '/common/default-preset'
import { ADAPTER_SETTINGS } from '../shared/PresetSettings/settings'
import { isValidServiceSetting } from '../shared/util'
import { getClientPreset } from '../shared/adapter'
import { toastStore } from './toasts'
import { presetApi } from './data/presets'
import { deepClone } from '/common/util'
import { getFallbackPreset } from '/common/presets'

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

const initModels = (): ModelState => ({ url: '', loading: false, list: [], data: [] })

const noopPreset: SetStoreFunction<PresetState> = (...args: any[]) => {}
const noopModels: SetStoreFunction<ModelState> = (...args: any[]) => {}

const PresetContext = createContext([initPreset(), noopPreset, initModels(), noopModels] as const)

type ModelState = { list: string[]; url: string; loading: boolean; data: any[] }

export function PresetProvider(props: { children: any }) {
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
  const [state, setState, models, setModels] = opts?.anonymous
    ? [...createStore(initPreset()), ...createStore(initModels())]
    : useContext(PresetContext)

  const [context, setContext] = createStore<PresetContext>({})
  const [hides, setHides] = createStore<{ [key in keyof AppSchema.GenSettings]?: boolean }>(
    createHides(state, context)
  )

  const loadChat = async (chat: AppSchema.Chat) => {
    console.log('[p_ctx] load-by-chat called')
    let preset = getClientPreset(chat)?.preset

    if (!preset) {
      const remote = await loadPresetId(chat.genPreset || '')
      preset = remote
    }

    // If the chat has no preset configured, we need to assign one
    if (chat?._id && !chat.genPreset && preset?._id) {
      getStore('chat').assignChatPreset(chat._id, preset._id, () =>
        toastStore.info('Assigned to chat')
      )
    }

    load(preset)
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

    if (!preset) {
      const remote = await presetApi.getPreset(presetId)
      if (remote.result) {
        load(remote.result)
        return remote.result
      }

      const fallback = getFallbackPreset('agnaistic')
      load(fallback)
      return fallback
    }

    load(preset)
    return preset
  }

  const load = (preset: Partial<AppSchema.GenSettings> | undefined) => {
    setState({ providerId: '', thirdPartyKeySet: false, providerModels: {}, ...preset })
    loadModels({ preset })
  }

  const loadModels = async (opts?: {
    preset?: Partial<AppSchema.GenSettings>
    refresh?: boolean
  }) => {
    setModels('loading', true)

    try {
      const models = await presetApi.getModelListByPreset(opts?.preset || state, opts?.refresh)
      if (models) {
        setModels({ list: models?.list || [], data: models?.data || [], url: models.url })
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
        loadModels({ preset: next })
      },
    })
  }

  createEffect(
    on(
      () =>
        (state._id || '') +
        state.service! +
        state.thirdPartyFormat! +
        state.presetMode! +
        state.providerId!,
      (id) => {
        const ctx = getPresetContext(state)
        setContext(ctx)

        const next = createHides(state, context)
        setHides(next)
      }
    )
  )

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
      hides,
      load: loadPresetId,
      loadChat,
      clear,
      upsert,
      update: updateAndSave,
      refreshModels: () => loadModels(),
      context,
    },
  ] as const
}

export function getClientPresetConnection(
  preset: Pick<AppSchema.GenSettings, 'service' | 'thirdPartyFormat' | 'providerId'>
) {
  const list = preset.providerId ? getStore('user').getState().user?.providers : undefined
  const conn = getPresetConnection(preset, list)
  return conn
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
}

function getPresetContext(
  preset: Pick<AppSchema.GenSettings, 'service' | 'thirdPartyFormat' | 'providerId'>
): PresetContext {
  const conn = getClientPresetConnection(preset)

  return {
    service: conn.service,
    format: conn.format,
    provider: conn.provider,
  }
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
