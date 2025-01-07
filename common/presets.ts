import { AppSchema } from './types/schema'
import { AIAdapter, AI_ADAPTERS, ChatAdapter, THIRDPARTY_FORMATS } from './adapters'
import { defaultPresets } from './default-preset'
import { deepClone } from './util'

export { defaultPresets }

export type GenerationPreset = keyof typeof defaultPresets

export type GenMap = { [key in keyof Omit<AppSchema.GenSettings, 'name'>]: string }

export const presetValidator = {
  service: AI_ADAPTERS,
  name: 'string',
  temp: 'number',
  tempLast: 'boolean?',
  dynatemp_range: 'number?',
  dynatemp_exponent: 'number?',
  smoothingFactor: 'number?',
  smoothingCurve: 'number?',
  maxTokens: 'number',
  maxContextLength: 'number?',
  repetitionPenalty: 'number',
  repetitionPenaltyRange: 'number',
  repetitionPenaltySlope: 'number',

  usePromptOrder: 'boolean?',

  memoryContextLimit: 'number?',
  memoryDepth: 'number?',
  memoryChatEmbedLimit: 'number?',
  memoryUserEmbedLimit: 'number?',

  minP: 'number?',
  typicalP: 'number',
  topP: 'number',
  topK: 'number',
  topA: 'number',

  tailFreeSampling: 'number',
  encoderRepitionPenalty: 'number?',
  addBosToken: 'boolean?',
  banEosToken: 'boolean?',
  skipSpecialTokens: 'boolean?',
  tokenHealing: 'boolean?',
  doSample: 'boolean?',
  penaltyAlpha: 'number?',
  earlyStopping: 'boolean?',
  numBeams: 'number?',

  frequencyPenalty: 'number',
  presencePenalty: 'number',
  systemPrompt: 'string?',
  ignoreCharacterSystemPrompt: 'boolean?',
  ignoreCharacterUjb: 'boolean?',
  gaslight: 'string?',
  oaiModel: 'string',
  openRouterModel: 'any?',
  featherlessModel: 'string?',
  arliModel: 'string?',
  googleModel: 'string?',

  mirostatTau: 'number?',
  mirostatLR: 'number?',
  cfgScale: 'number?',
  cfgOppose: 'string?',
  phraseRepPenalty: 'string?',

  stopSequences: ['string?'],
  trimStop: 'boolean?',
  thirdPartyUrl: 'string?',
  thirdPartyKey: 'string?',
  thirdPartyFormat: [...THIRDPARTY_FORMATS, null],
  thirdPartyUrlNoSuffix: 'boolean?',
  thirdPartyModel: 'string?',

  dryAllowedLength: 'number?',
  dryBase: 'number?',
  drySequenceBreakers: ['string?'],
  dryMultiplier: 'number?',

  novelModel: 'string?',
  novelModelOverride: 'string?',

  claudeModel: 'string',
  mistralModel: 'string?',
  streamResponse: 'boolean?',
  ultimeJailbreak: 'string?',
  prefixNameAppend: 'boolean?',
  prefill: 'string?',
  antiBond: 'boolean?',

  replicateModelType: 'string?',
  replicateModelVersion: 'string?',
  replicateModelName: 'string?',

  order: 'any?',
  disabledSamplers: 'any?',
  registered: 'any?',

  swipesPerGeneration: 'number?',
  epsilonCutoff: 'number?',
  etaCutoff: 'number?',
  mirostatToggle: 'boolean?',
  presetMode: ['simple', 'advanced', null],
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

  for (const [keyStr, value] of Object.entries(map || {})) {
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
  for (const [keyStr, value] of Object.entries(map || {})) {
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

export const serviceGenMap: { [key in ChatAdapter]?: GenMap } = {
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
    minP: 'min_p',
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
    minP: '',
  },
  ooba: {
    maxTokens: 'max_new_tokens',
    topP: 'top_p',
    temp: 'temperature',
    typicalP: 'typical_p',
    repetitionPenalty: 'repetition_penalty',
    doSample: 'do_sample',
    encoderRepitionPenalty: 'encoder_repetition_penalty',
    topK: 'top_k',
    penaltyAlpha: 'penalty_alpha',
    addBosToken: 'add_bos_token',
    banEosToken: 'ban_eos_token',
    skipSpecialTokens: 'skip_special_tokens',
    earlyStopping: 'early_stopping',
    numBeams: 'num_beams',
    topA: '',
    order: '',
    repetitionPenaltyRange: '',
    repetitionPenaltySlope: '',
    tailFreeSampling: '',
    minP: 'min_p',
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
    minP: '',
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
    minP: '',
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
    minP: '',
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
    minP: '',
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
    minP: '',
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
    minP: '',
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
    minP: '',
  },
  mancer: {
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
    minP: 'min_p',
  },
  petals: {
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
    gaslight: '',
    claudeModel: '',
    minP: '',
  },
  agnaistic: {
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
    minP: '',
  },
}

export function isDefaultPreset(value?: string): value is GenerationPreset {
  if (!value) return false
  return value in defaultPresets
}

export function getFallbackPreset(adapter: AIAdapter): Partial<AppSchema.GenSettings> {
  switch (adapter) {
    case 'petals':
    case 'horde':
      return deepClone(defaultPresets.horde)

    case 'kobold':
    case 'ooba':
      return deepClone(defaultPresets.basic)

    case 'agnaistic':
      return deepClone(defaultPresets.agnai)

    case 'openai':
      return deepClone(defaultPresets.openai)

    case 'novel':
      return deepClone(defaultPresets.novel_clio)

    case 'scale':
      return deepClone(defaultPresets.scale)

    case 'claude':
      return deepClone(defaultPresets.claude)

    case 'goose':
      return deepClone({ ...defaultPresets.basic, service: 'goose' })

    case 'replicate':
      return deepClone(defaultPresets.replicate_vicuna_13b)

    /** TODO: Create default preset for OpenRouter... */
    case 'openrouter':
      return deepClone(defaultPresets.openai)

    case 'mancer':
      return deepClone(defaultPresets.mancer)

    case 'venus':
      return deepClone(defaultPresets.venus)
  }
}
