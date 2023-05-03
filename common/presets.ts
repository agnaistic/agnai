import { AppSchema } from '../srv/db/schema'
import { AIAdapter, AI_ADAPTERS, ChatAdapter } from './adapters'
import { defaultPresets } from './default-preset'

export { defaultPresets }

export type GenerationPreset = keyof typeof defaultPresets

export type GenMap = { [key in keyof Omit<AppSchema.GenSettings, 'name'>]: string }

export const chatGenSettings = {
  service: AI_ADAPTERS,
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
  encoderRepitionPenalty: 'number?',
  addBosToken: 'boolean?',
  banEosToken: 'boolean?',
  penaltyAlpha: 'number?',
  order: ['number?'],
  frequencyPenalty: 'number',
  presencePenalty: 'number',
  gaslight: 'string',
  oaiModel: 'string',
  claudeModel: 'string',
  useGaslight: 'boolean?',
  ultimeJailbreak: 'string?',
  antiBond: 'boolean?',
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
    order: '',
  },
  ooba: {
    maxTokens: 'max_new_tokens',
    topP: 'top_p',
    temp: 'temperature',
    typicalP: 'typical_p',
    repetitionPenalty: 'repetition_penalty',
    encoderRepitionPenalty: 'encoder_repetition_penalty',
    topK: 'top_k',
    penaltyAlpha: 'penalty_alpha',
    addBosToken: 'add_bos_token',
    banEosToken: 'ban_eos_token',
    topA: '',
    order: '',
    repetitionPenaltyRange: '',
    repetitionPenaltySlope: '',
    tailFreeSampling: '',
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
    maxContextLength: 'max_context_length',
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
  claude: {
    maxTokens: 'max_tokens_to_sample',
    repetitionPenalty: '',
    repetitionPenaltyRange: '',
    repetitionPenaltySlope: '',
    tailFreeSampling: '',
    temp: 'temperature',
    topK: '',
    topP: '',
    typicalP: '',
    topA: '',
    gaslight: 'gaslight',
    claudeModel: 'claudeModel',
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
    case 'horde':
      return defaultPresets.horde

    case 'kobold':
    case 'luminai':
    case 'ooba':
      return defaultPresets.basic

    case 'openai':
      return defaultPresets.openai

    case 'novel':
      return defaultPresets.novel_20BC

    case 'scale':
      return defaultPresets.scale

    case 'claude':
      return defaultPresets.claude

    default:
      throw new Error(`Unknown adapter: ${adapter}`)
  }
}
