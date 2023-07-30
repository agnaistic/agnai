import { AppSchema } from './types/schema'
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
  memoryChatEmbedLimit: 'number?',
  memoryUserEmbedLimit: 'number?',

  typicalP: 'number',
  topP: 'number',
  topK: 'number',
  topA: 'number',
  tailFreeSampling: 'number',
  encoderRepitionPenalty: 'number?',
  addBosToken: 'boolean?',
  banEosToken: 'boolean?',
  skipSpecialTokens: 'boolean?',
  penaltyAlpha: 'number?',
  order: ['number?'],
  frequencyPenalty: 'number',
  presencePenalty: 'number',
  systemPrompt: 'string?',
  ignoreCharacterSystemPrompt: 'boolean?',
  ignoreCharacterUjb: 'boolean?',
  gaslight: 'string?',
  oaiModel: 'string',
  openRouterModel: 'any?',

  cfgScale: 'number?',
  cfgOppose: 'string?',

  thirdPartyUrl: 'string?',
  thirdPartyFormat: ['kobold', 'openai', 'claude', null],

  novelModel: 'string?',
  novelModelOverride: 'string?',

  claudeModel: 'string',
  streamResponse: 'boolean?',
  useGaslight: 'boolean?',
  ultimeJailbreak: 'string?',
  antiBond: 'boolean?',
  useTemplateParser: 'boolean?',

  replicateModelType: 'string?',
  replicateModelVersion: 'string?',
  replicateModelName: 'string?',
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
    skipSpecialTokens: 'skip_special_tokens',
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
    streamResponse: 'stream',
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
  goose: {
    maxTokens: 'max_tokens',
    repetitionPenalty: 'repetition_penalty',
    repetitionPenaltyRange: 'repetition_penalty_slope',
    repetitionPenaltySlope: 'repetition_penalty_range',
    tailFreeSampling: 'tfs',
    temp: 'temperature',
    topK: 'top_k',
    topP: 'top_p',
    typicalP: 'typical_p',
    topA: 'top_a',
    order: '',
    frequencyPenalty: 'frequency_penalty',
    presencePenalty: 'presence_penalty',
    gaslight: '',
    oaiModel: '',
  },
  replicate: {
    maxTokens: 'max_tokens',
    repetitionPenalty: 'repetition_penalty',
    repetitionPenaltyRange: '',
    repetitionPenaltySlope: '',
    tailFreeSampling: '',
    temp: 'temperature',
    topK: '',
    topP: 'top_p',
    typicalP: '',
    topA: '',
    order: '',
    frequencyPenalty: '',
    presencePenalty: '',
    gaslight: '',
    replicateModelType: 'replicateModelType',
    replicateModelVersion: 'replicateModelVersion',
  },
  openrouter: {
    maxTokens: 'max_tokens',
    temp: 'temperature',
    repetitionPenalty: '',
    repetitionPenaltyRange: '',
    repetitionPenaltySlope: '',
    tailFreeSampling: '',
    topA: '',
    topK: '',
    topP: '',
    typicalP: '',
    addBosToken: '',
    antiBond: '',
    banEosToken: '',
    claudeModel: '',
    encoderRepitionPenalty: '',
    frequencyPenalty: '',
    gaslight: '',
  },
}

export function isDefaultPreset(value?: string): value is GenerationPreset {
  if (!value) return false
  return value in defaultPresets
}

export function getFallbackPreset(adapter: AIAdapter): Partial<AppSchema.GenSettings> {
  switch (adapter) {
    case 'horde':
      return defaultPresets.horde

    case 'kobold':
    case 'ooba':
      return defaultPresets.basic

    case 'openai':
      return defaultPresets.openai

    case 'novel':
      return defaultPresets.novel_clio

    case 'scale':
      return defaultPresets.scale

    case 'claude':
      return defaultPresets.claude

    case 'goose':
      return { ...defaultPresets.basic, service: 'goose' }

    case 'replicate':
      return defaultPresets.replicate_vicuna_13b

    /** TODO: Create default preset for OpenRouter... */
    case 'openrouter':
      return defaultPresets.openai
  }
}

export function getInferencePreset(
  user: AppSchema.User,
  adapter: AIAdapter,
  model?: string
): Partial<AppSchema.GenSettings> {
  switch (adapter) {
    case 'horde':
      return defaultPresets.horde

    case 'kobold':
    case 'ooba':
      return defaultPresets.basic

    case 'openai':
      return defaultPresets.openai

    case 'novel': {
      if (model === 'kayra-v1' || user.novelModel === 'kayra-v1') return defaultPresets.novel_kayra
      return defaultPresets.novel_clio
    }

    case 'scale':
      return defaultPresets.scale

    case 'claude':
      return defaultPresets.claude

    case 'goose':
      return { ...defaultPresets.basic, service: 'goose' }

    case 'replicate':
      return defaultPresets.replicate_vicuna_13b

    /** TODO: Create default preset for OpenRouter... */
    case 'openrouter':
      return defaultPresets.openai
  }
}
