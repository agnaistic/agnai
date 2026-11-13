import { PresetAISettings } from '/common/adapters'
import { GROK_PRESET_SETTINGS } from '/srv/adapter/grok-preset'

/**
 * Known providers whose Generation Presets form is the adapter's own field list.
 * Add a provider by exporting its list from a browser-safe adapter module and registering it here.
 */
export const KNOWN_PROVIDER_PRESET_SETTINGS: Record<string, readonly (keyof PresetAISettings)[]> = {
  'known-xai': GROK_PRESET_SETTINGS,
}

export function knownProviderPresetSettings(providerKey?: string) {
  if (!providerKey) return
  return KNOWN_PROVIDER_PRESET_SETTINGS[providerKey]
}
