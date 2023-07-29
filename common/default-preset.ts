import { AppSchema } from './types/schema'
import { claudePresets } from './presets/claude'
import { hordePresets } from './presets/horde'
import { koboldPresets } from './presets/kobold'
import { novelPresets } from './presets/novel'
import { oobaPresets } from './presets/ooba'
import { openaiPresets } from './presets/openai'
import { replicatePresets } from './presets/replicate'
import { scalePresets } from './presets/scale'
import { openRouterPresets } from './presets/openrouter'

const builtinPresets = {
  ...hordePresets,
  ...koboldPresets,
  ...novelPresets,
  ...openaiPresets,
  ...replicatePresets,
  ...scalePresets,
  ...claudePresets,
  ...oobaPresets,
  ...openRouterPresets,
} satisfies Record<string, Partial<AppSchema.GenSettings>>

export const defaultPresets = {
  ...builtinPresets,
  goose: { ...builtinPresets.basic, service: 'goose' },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
