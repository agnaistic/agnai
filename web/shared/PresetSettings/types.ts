import { AIAdapter } from '/common/adapters'
import { AppSchema } from '/common/types'

export type PresetProps = {
  inherit?: Partial<Omit<AppSchema.SubscriptionModel, 'kind'>>
  disabled?: boolean
  service?: AIAdapter
  onService?: (service?: AIAdapter) => void
  disableService?: boolean
  hideTabs?: PresetTab[]
}

export type PresetTab = 'General' | 'Prompt' | 'Memory' | 'Samplers' | 'Toggles'
