import { AIAdapter, AI_ADAPTERS, ChatAdapter } from '../../../common/adapters'
import { AppSchema } from '../../db/schema'

export type GenerationPreset = keyof typeof presets

export const presets = {
  basic: {
    adapters: AI_ADAPTERS.slice(),
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
  },
  novel_20BC: {
    adapters: ['novel'],
    name: 'Novel 20BC+',
    maxTokens: 160,
    repetitionPenalty: 1.055,
    repetitionPenaltyRange: 2048,
    repetitionPenaltySlope: 3.33,
    temp: 0.65,
    tailFreeSampling: 0.879,
    topK: 20,
    topP: 1,
    order: [0, 1, 2, 3],
  },
  novel_blueLighter: {
    adapters: ['novel'],
    name: 'Novel Blue Lighter',
    maxTokens: 160,
    repetitionPenalty: 1.05,
    repetitionPenaltyRange: 560,
    repetitionPenaltySlope: 0,
    temp: 1.33,
    tailFreeSampling: 0.937,
    topK: 1,
    topP: 1,
    typicalP: 0.965,
    topA: 0.085,
    order: [3, 4, 5, 2, 0],
  },
} satisfies Record<string, Partial<AppSchema.GenSettings> & { adapters: AIAdapter[] }>

export type GenMap = { [key in keyof Omit<AppSchema.GenSettings, 'name'>]: string }

export function getGenSettings(
  preset: GenerationPreset | AppSchema.GenSettings,
  adapter: AIAdapter
) {
  const map = maps[adapter]
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
    topA: 'top_a',
    order: 'sampler_order',
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
    topA: 'top_a',
    order: 'order',
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
    topA: '',
    order: '',
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
    topA: '',
    order: '',
  },
  horde: {
    maxTokens: 'max_length',
    repetitionPenalty: 'rep_pen',
    repetitionPenaltyRange: 'rep_pen_range',
    repetitionPenaltySlope: 'rep_pen_slope',
    tailFreeSampling: 'tfs',
    temp: 'temperature',
    topK: 'top_k',
    topP: 'top_p',
    typicalP: 'typical',
    topA: 'top_a',
    order: 'sampler_order',
  },
}
