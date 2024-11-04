import { SetStoreFunction, createStore } from 'solid-js/store'
import { AIAdapter } from '/common/adapters'
import { AppSchema } from '/common/types'
import { SubscriptionModelOption } from '/common/types/presets'
import { agnaiPresets } from '/common/presets/agnaistic'

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
  sub: SubscriptionModelOption | undefined
  tab: string
}

export type PresetState = Omit<AppSchema.SubscriptionModel, 'kind'> & {
  disabled?: boolean
}

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
  const { disabled, ...form } = state

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
}

export function getPresetEditor() {
  const [store, setStore] = createStore(initPreset)
  return [store, setStore] as const
}
