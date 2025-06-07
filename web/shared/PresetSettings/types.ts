import { SetStoreFunction, createStore } from 'solid-js/store'
import { AIAdapter, MODE_SETTINGS, PresetAISettings, ThirdPartyFormat } from '/common/adapters'
import { AppSchema } from '/common/types'
import { SubscriptionModelOption } from '/common/types/presets'
import { agnaiPresets } from '/common/presets/agnaistic'
import { createEffect, on } from 'solid-js'
import { ADAPTER_SETTINGS } from './settings'
import { isValidServiceSetting } from '../util'
import { getStore } from '/web/store/create'
import { getPresetConnection } from '/common/providers'

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
  disabled?: boolean
}

export type HideState = ReturnType<typeof getPresetEditor>[2]

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

export const initPreset: Omit<AppSchema.SubscriptionModel, 'kind'> & {
  userId: string
  disabled: boolean
} = {
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

export function getPresetEditor() {
  const [store, setStore] = createStore(initPreset)
  const [context, setContext] = createStore<PresetContext>({})
  const [hide, setHides] = createStore<{ [key in keyof AppSchema.GenSettings]?: boolean }>(
    createHides(store, context)
  )

  createEffect(
    on(
      () =>
        (store._id || '') +
        store.service! +
        store.thirdPartyFormat! +
        store.presetMode! +
        store.providerId!,
      (id) => {
        const ctx = getPresetContext(store)
        setContext(ctx)

        const next = createHides(store, context)
        setHides(next)
      }
    )
  )

  return [store, setStore, hide, context] as const
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
