import { AIAdapter } from '../../../common/adapters'
import { GenerationPreset, GenMap, presets, serviceGenMap } from '../../../common/presets'
import { AppSchema } from '../../db/schema'

export const GENERATION_PRESET = Object.keys(presets) as GenerationPreset[]

export function getGenSettings(
  preset: GenerationPreset | AppSchema.GenSettings,
  adapter: AIAdapter
) {
  const map = serviceGenMap[adapter]
  const presetValues = (
    typeof preset === 'string' ? presets[preset] : preset
  ) as AppSchema.GenSettings

  const body: any = {}
  for (const [keyStr, value] of Object.entries(map)) {
    const key = keyStr as keyof GenMap
    if (!value) continue

    const presetValue = presetValues[key]
    if (presetValue === undefined) continue

    body[value] = presetValues[key]
  }

  return body
}
