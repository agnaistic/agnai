import { SetStoreFunction, createStore } from 'solid-js/store'
import { AIAdapter, MODE_SETTINGS, PresetAISettings, ThirdPartyFormat } from '/common/adapters'
import { AppSchema } from '/common/types'
import { SubscriptionModelOption } from '/common/types/presets'
import { agnaiPresets } from '/common/presets/agnaistic'
import { createContext, createEffect, on, useContext } from 'solid-js'
import { getStore } from '/web/store/create'
import { getPresetConnection } from '/common/providers'
import { isDefaultPreset } from '/common/default-preset'
import { ADAPTER_SETTINGS } from '../shared/PresetSettings/settings'
import { isValidServiceSetting } from '../shared/util'
import { getClientPreset } from '../shared/adapter'

export type PresetProps = {
  disabled?: boolean
  service?: AIAdapter
  disableService?: boolean
  hideTabs?: PresetTab[]
  page?: string
}

export type PresetTab = 'General' | 'Prompt' | 'Memory' | 'Samplers' | 'Toggles'

export type PresetTabProps = {
  state: PresetState
  context: PresetContext
  setter: SetPresetState
  hides: HideState
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
  providerModels: {},
  registered: {},
})

const noop: SetStoreFunction<PresetState> = (...args: any[]) => {}

const PresetContext = createContext([initPreset(), noop] as const)

export function PresetProvider(props: { children: any }) {
  const [store, setStore] = createStore(initPreset())

  return <PresetContext.Provider value={[store, setStore]}>{props.children}</PresetContext.Provider>
}

export function usePresetContext() {
  const [state, setState] = useContext(PresetContext)
  const [context, setContext] = createStore<PresetContext>({})
  const [hides, setHides] = createStore<{ [key in keyof AppSchema.GenSettings]?: boolean }>(
    createHides(state, context)
  )

  const loadChat = (chat: AppSchema.Chat) => {
    console.log('[p_ctx] load-by-chat called')
    const preset = getClientPreset(chat)
    load(preset?.preset)
  }

  const loadPresetId = (presetId: string) => {
    console.log('[p_ctx] load-by-id called')
    const presets = getStore('presets').getState().presets
    let preset = presets.find((p) => p._id === presetId)
    load(preset)
  }

  const load = (preset: Partial<AppSchema.GenSettings> | undefined) => {
    console.log('[p_ctx] load called')
    if (!preset) return

    const user = getStore('user').getState().user
    setState({ providerId: '', thirdPartyKeySet: false, providerModels: {}, ...preset })
    getStore('presets').getPresetModelList(preset, user?.providers || [], true)
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
      onSuccess: opts?.onSuccess,
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
      setState,
      hides,
      load: loadPresetId,
      loadChat,
      clear,
      upsert,
      update: updateAndSave,
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
