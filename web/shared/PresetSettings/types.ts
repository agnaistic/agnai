import { SetStoreFunction, createStore } from 'solid-js/store'
import { AIAdapter, MODE_SETTINGS, PresetAISettings } from '/common/adapters'
import { AppSchema } from '/common/types'
import { SubscriptionModelOption } from '/common/types/presets'
import { agnaiPresets } from '/common/presets/agnaistic'
import { createEffect, on } from 'solid-js'
import { ADAPTER_SETTINGS } from './settings'
import { isValidServiceSetting } from '../util'

export type PresetProps = {
  disabled?: boolean
  service?: AIAdapter
  disableService?: boolean
  hideTabs?: PresetTab[]
}

export type PresetTab = 'General' | 'Prompt' | 'Memory' | 'Samplers' | 'Toggles'

export type PresetTabProps = {
  state: PresetState
  setter: SetPresetState
  hides: HideState
  sub: SubscriptionModelOption | undefined
  tab: string
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
}

export function getPresetEditor() {
  const [store, setStore] = createStore(initPreset)
  const [hide, setHides] = createStore<{ [key in keyof AppSchema.GenSettings]?: boolean }>(
    createHides(store)
  )

  createEffect(
    on(
      () => store.service! + store.thirdPartyFormat! + store.presetMode!,
      () => {
        const next = createHides(store)
        setHides(next)
      }
    )
  )

  return [store, setStore, hide] as const
}

function createHides(store: PresetState) {
  const keys = Object.keys(ADAPTER_SETTINGS) as Array<keyof AppSchema.GenSettings>
  let hides: any = {}

  for (const key of keys) {
    const hide = hidePresetSetting(store, key as any)
    hides[key] = hide
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
