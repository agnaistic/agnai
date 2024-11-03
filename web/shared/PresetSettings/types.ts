import { SetStoreFunction } from 'solid-js/store'
import { AIAdapter } from '/common/adapters'
import { AppSchema } from '/common/types'
import { SubscriptionModelOption } from '/common/types/presets'
import { agnaiPresets } from '/common/presets/agnaistic'

export type PresetProps = {
  inherit?: Omit<AppSchema.SubscriptionModel, 'kind'>
  disabled?: boolean
  service?: AIAdapter
  disableService?: boolean
  hideTabs?: PresetTab[]
  state: (state: PresetState, setter: SetPresetState) => void
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
  pane: boolean
}

export type SetPresetState = SetStoreFunction<PresetState>

export function getPresetForm(state: PresetState) {
  const {
    disabled,
    pane,
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
  const { disabled, pane, ...form } = state
  return form
}

export const initPreset: Omit<AppSchema.SubscriptionModel, 'kind'> = {
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
  allowGuestUsage: false,
}
