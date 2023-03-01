import { ChatAdapter } from '../../../common/adapters'
import { AppSchema } from '../../db/schema'
import { logger } from '../../logger'

const basic: AppSchema.GenSettings = {
  name: 'Simple',
  maxTokens: 200,
  repetitionPenalty: 1.08,
  repetitionPenaltySlope: 0.9,
  repetitionPenaltyRange: 1024,
  temp: 0.65,
  topK: 0,
  topP: 0.9,
  typicalP: 1,
  tailFreeSampling: 0.9,
}

export type GenerationPreset = keyof typeof presets

export const presets = {
  basic,
} satisfies Record<string, AppSchema.GenSettings>

export type GenMap = { [key in keyof Omit<AppSchema.GenSettings, 'name'>]: string }

export function getGenSettings(
  preset: GenerationPreset | AppSchema.GenSettings,
  adapter: Exclude<ChatAdapter, 'default'>
) {
  const map = maps[adapter]
  const presetValues = typeof preset === 'string' ? presets[preset] : preset

  const body: any = {}
  for (const [keyStr, value] of Object.entries(map)) {
    const key = keyStr as keyof GenMap
    if (!value) continue

    body[value] = presetValues[key]
  }

  return body
}

const maps: Record<Exclude<ChatAdapter, 'default'>, GenMap> = {
  kobold: {
    maxTokens: 'max_length',
    repetitionPenalty: 'rep_pen',
    repetitionPenaltyRange: 'rep_pen_range',
    repetitionPenaltySlope: 'rep_pen_slope',
    tailFreeSampling: 'tfs',
    temp: 'temperature',
    topK: 'top_k',
    topP: 'top_p',
    typicalP: 'typical',
  },
  novel: {
    maxTokens: 'max_length',
    repetitionPenalty: 'repetition_penalty',
    repetitionPenaltyRange: 'repetition_penalty_range',
    repetitionPenaltySlope: 'repetition_penalty_slope',
    tailFreeSampling: 'tail_free_sampling',
    temp: 'temperature',
    topK: 'top_k',
    topP: 'top_p',
    typicalP: 'typical_p',
  },
  chai: {
    repetitionPenalty: 'repetition_penalty',
    maxTokens: 'max_length',
    temp: 'temperature',
    topK: 'top_k',
    topP: 'top_p',
    repetitionPenaltyRange: '',
    repetitionPenaltySlope: '',
    tailFreeSampling: '',
    typicalP: '',
  },
  ooba: {
    maxTokens: '',
    repetitionPenalty: '',
    repetitionPenaltyRange: '',
    repetitionPenaltySlope: '',
    tailFreeSampling: '',
    temp: '',
    topK: '',
    topP: '',
    typicalP: '',
  },
}
