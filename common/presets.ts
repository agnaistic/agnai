import { AppSchema } from '../srv/db/schema'
import { AIAdapter, ChatAdapter, OPENAI_MODELS } from './adapters'

export type GenerationPreset = keyof typeof defaultPresets

export type GenMap = { [key in keyof Omit<AppSchema.GenSettings, 'name'>]: string }

const MAX_TOKENS = 80

export const presetValidator = {
  name: 'string',
  temp: 'number',
  maxTokens: 'number',
  maxContextLength: 'number?',
  repetitionPenalty: 'number',
  repetitionPenaltyRange: 'number',
  repetitionPenaltySlope: 'number',
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
} as const

export const defaultPresets = {
  basic: {
    name: 'Simple',
    maxTokens: MAX_TOKENS,
    maxContextLength: 2048,
    repetitionPenalty: 1.08,
    repetitionPenaltySlope: 0.9,
    repetitionPenaltyRange: 1024,
    temp: 0.65,
    topK: 0,
    topP: 0.9,
    typicalP: 1,
    topA: 1,
    tailFreeSampling: 0.9,
    order: [0, 1, 2, 3, 4, 5, 6],
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    gaslight: '',
    oaiModel: 'text-davinci-003',
    memoryDepth: 5,
  },
  novel_20BC: {
    name: 'Novel 20BC+',
    maxTokens: MAX_TOKENS,
    maxContextLength: 2048,
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
    name: 'Novel Blue Lighter',
    maxTokens: MAX_TOKENS,
    maxContextLength: 2048,
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
  openai: {
    name: 'OpenAI',
    temp: 0.5,
    oaiModel: OPENAI_MODELS.DaVinci,
    maxTokens: 300,
    maxContextLength: 4095,
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    gaslight:
      "Enter roleplay mode. You will write {{name}}'s next reply in a dialogue between {{name}} and {{user}}. Do not decide what You says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *he jumps in excitement*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)\nAvoid writing a NSFW/Smut reply. Creatively write around it NSFW/Smut scenarios in character.\n\nDescription of {{name}}:\n{{personality}}\nCircumstances and context of the dialogue: {{scenario}}\n",
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>

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
}

export function isDefaultPreset(value?: string): value is GenerationPreset {
  if (!value) return false
  return value in defaultPresets
}
