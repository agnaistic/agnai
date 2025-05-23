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
import { agnaiPresets } from './presets/agnaistic'
import type { GenerationPreset } from './presets'
import { AIAdapter } from './adapters'

const builtinPresets = {
  ...agnaiPresets,
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

export const presetDefaults = {
  service: 'kobold' as AIAdapter,
  name: 'Simple',
  useMaxContext: true,
  presetMode: 'simple' as AppSchema.GenSettings['presetMode'],
  maxTokens: 300,
  maxContextLength: 8192,
  repetitionPenalty: 1,
  repetitionPenaltySlope: 1,
  repetitionPenaltyRange: 1024,
  temp: 0.8,
  topK: 0,
  topP: 1,
  minP: 0.02,
  typicalP: 1,
  topA: 0,
  tailFreeSampling: 1,
  encoderRepitionPenalty: 1.0,
  penaltyAlpha: 0,
  addBosToken: true,
  banEosToken: false,
  skipSpecialTokens: true,
  order: [0, 1, 2, 3, 4, 5, 6],
  frequencyPenalty: 0,
  presencePenalty: 0,
  gaslight: '',
  ultimeJailbreak: '',
  oaiModel: '',
  streamResponse: true,
  memoryDepth: 50,
  memoryContextLimit: 500,
  memoryReverseWeight: false,
  antiBond: false,
}

export const defaultPresets = {
  ...builtinPresets,
  goose: { ...presetDefaults, service: 'goose' },
} satisfies Record<string, Partial<AppSchema.GenSettings>>

export function isDefaultPreset(value?: string): value is GenerationPreset {
  if (!value) return false
  return value in defaultPresets
}
