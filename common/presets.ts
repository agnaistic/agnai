import { AppSchema } from '../srv/db/schema'
import { AIAdapter, ChatAdapter } from './adapters'
import { defaultPresets } from './default-preset'

export { defaultPresets }

export type GenerationPreset = keyof typeof defaultPresets

export type GenMap = { [key in keyof Omit<AppSchema.GenSettings, 'name'>]: string }

export const chatGenSettings = {
  temp: 'number',
  maxTokens: 'number',
  maxContextLength: 'number?',
  repetitionPenalty: 'number',
  repetitionPenaltyRange: 'number',
  repetitionPenaltySlope: 'number',
  memoryContextLimit: 'number?',
  memoryDepth: 'number?',
  typicalP: 'number',
  topP: 'number',
  topK: 'number',
  topA: 'number',
  tailFreeSampling: 'number',
  order: ['number?'],
  frequencyPenalty: 'number',
  presencePenalty: 'number',
  gaslight: 'string',
  oaiModel: 'string',
  useGaslight: 'boolean?',
} as const

export const presetValidator = {
  name: 'string',
  ...chatGenSettings,
} as const

const disabledValues: { [key in keyof GenMap]?: AppSchema.GenSettings[key] } = {
  topP: 1,
  topK: 0,
  topA: 1,
  typicalP: 1,
  tailFreeSampling: 1,
  repetitionPenalty: 1,
  repetitionPenaltySlope: 0,
}

export function mapPresetsToAdapter(presets: Partial<AppSchema.GenSettings>, adapter: AIAdapter) {
  const map = serviceGenMap[adapter]
  const body: any = {}

  for (const [keyStr, value] of Object.entries(map)) {
    const key = keyStr as keyof GenMap
    if (!value) continue

    const presetValue = presets[key]
    const disabledValue = disabledValues[key]

    if (presetValue === undefined) continue

    // Remove disabled values from generation settings
    if (disabledValue !== undefined && presetValue === disabledValue) continue

    body[value] = presetValue
  }

  return body
}

export function getGenSettings(chat: AppSchema.Chat, adapter: AIAdapter) {
  const map = serviceGenMap[adapter]
  const presetValues = getPresetValues(chat)

  const body: any = {}
  for (const [keyStr, value] of Object.entries(map)) {
    const key = keyStr as keyof GenMap
    if (!value) continue

    const presetValue = presetValues[key]
    const disabledValue = disabledValues[key]

    if (presetValue === undefined) continue

    // Remove disabled values from generation settings
    if (disabledValue !== undefined && presetValue === disabledValue) continue

    body[value] = presetValue
  }

  return body
}

function getPresetValues(chat: AppSchema.Chat): Partial<AppSchema.GenSettings> {
  if (chat.genPreset && isDefaultPreset(chat.genPreset)) {
    return defaultPresets[chat.genPreset]
  }

  if (chat.genSettings) return chat.genSettings

  return defaultPresets.basic
}

export const serviceGenMap: Record<Exclude<ChatAdapter, 'default'>, GenMap> = {
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
  luminai: {
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
  openai: {
    maxTokens: 'max_tokens',
    maxContextLength: 'maxContextLength',
    repetitionPenalty: '',
    repetitionPenaltyRange: '',
    repetitionPenaltySlope: '',
    tailFreeSampling: '',
    temp: 'temperature',
    topK: '',
    topP: '',
    typicalP: '',
    topA: '',
    order: '',
    frequencyPenalty: 'frequency_penalty',
    presencePenalty: 'presence_penalty',
    gaslight: 'gaslight',
    oaiModel: 'oaiModel',
  },
  scale: {
    maxTokens: '',
    repetitionPenalty: '',
    repetitionPenaltyRange: '',
    repetitionPenaltySlope: '',
    tailFreeSampling: '',
    temp: 'temperature',
    topK: '',
    topP: '',
    typicalP: '',
    topA: '',
    order: '',
    frequencyPenalty: '',
    presencePenalty: '',
    gaslight: '',
    oaiModel: '',
  },
}

export function isDefaultPreset(value?: string): value is GenerationPreset {
  if (!value) return false
  return value in defaultPresets
}

export function getFallbackPreset(adapter: AIAdapter) {
  switch (adapter) {
    case 'chai':
    case 'kobold':
    case 'horde':
    case 'luminai':
    case 'ooba':
      return defaultPresets.basic

    case 'openai':
      return defaultPresets.openai

    case 'novel':
      return defaultPresets.novel_20BC

    case 'scale':
      return defaultPresets.scale
  }
}
