import { defaultPresets, isDefaultPreset } from './default-preset'
import { NOVEL_MODELS } from './presets/novel'
import { OPENAI_MODELS } from './presets/openai'
import { getPresetConnection, PresetConnection } from './providers'
import { AppSchema } from './types/schema'

export type AdapterSetting = {
  /** The name of the field within the settings object */
  field: string

  /** The name as it appears in the Settings UI */
  label: string

  /** Any additional information about the setting (for UI only) */
  helperText?: string

  /** If this is a secret that should be encrypted */
  secret: boolean

  /** If the field should be hidden from the UI */
  hidden?: boolean

  setting: SettingType
  preset?: boolean

  /**
   * If enabled the setting won't be visible in "Simple" preset mode
   * Defaults to true
   */
  advanced?: boolean
}

type SettingType =
  | { type: 'list'; options: Array<{ label: string; value: string }> }
  | { type: 'text'; placeholder?: string }
  | { type: 'boolean' }

export type AdapterOptions = {
  /** Name of the adapter that will be displayed in the UI */
  label: string
  settings: AdapterSetting[]
  options: Array<keyof PresetAISettings>
  load?: (user?: AppSchema.User | null) => AdapterSetting[]
}

export const MODE_SETTINGS: {
  [key in NonNullable<PresetAISettings['presetMode']>]?: {
    [key in keyof AppSchema.GenSettings]?: boolean
  }
} = {
  // Settings to extract from the Recommended preset
  simple: {
    modelFormat: true,
    topA: true,
    topK: true,
    topP: true,
    minP: true,
    doSample: true,
    cfgOppose: true,
    addBosToken: true,
    cfgScale: true,
    dryAllowedLength: true,
    dryBase: true,
    dryMultiplier: true,
    dryRange: true,
    drySequenceBreakers: true,
    banEosToken: true,
    dynatemp_exponent: true,
    dynatemp_range: true,
    earlyStopping: true,
    etaCutoff: true,
    epsilonCutoff: true,
    encoderRepitionPenalty: true,
    frequencyPenalty: true,
    xtcThreshold: true,
    xtcProbability: true,
    mirostatLR: true,
    mirostatTau: true,
    mirostatToggle: true,
    penaltyAlpha: true,
    phraseBias: true,
    phraseRepPenalty: true,
    repetitionPenalty: true,
    repetitionPenaltyRange: true,
    repetitionPenaltySlope: true,
    presencePenalty: true,
    skipSpecialTokens: true,
    smoothingCurve: true,
    smoothingFactor: true,
    reasoning: true,
    tempLast: true,
    tailFreeSampling: true,
    tokenHealing: true,
    typicalP: true,
    tokenizer: true,

    ultimeJailbreak: true,
    // thirdPartyModel: true,
    // thirdPartyFormat: true,
    // thirdPartyUrl: true,
    // maxContextLength: true,
    maxTokens: true,
    streamResponse: true,
    temp: true,
    stopSequences: true,
    thirdPartyKey: true,

    // localRequests: true,
    // openRouterModel: true,
    // oaiModel: true,
    // claudeModel: true,
    // novelModel: true,
    // mistralModel: true,
  },
  advanced: {},
}

export const PERSONA_FORMATS = ['boostyle', 'wpp', 'sbf', 'attributes', 'text'] as const

export const PERSONA_LABELS: { [key in PersonaFormat]: string } = {
  boostyle: 'Boostyle',
  wpp: 'W++',
  sbf: 'SBF',
  attributes: 'Attributes (NovelAI)',
  text: 'Plain Text',
}

export const JSON_SCHEMA_SUPPORTED: { [key in AIAdapter | ThirdPartyFormat]?: boolean } = {
  agnaistic: true,
  llamacpp: true,
  tabby: true,
}

export const THIRDPARTY_HANDLERS: { [svc in ThirdPartyFormat]: AIAdapter } = {
  openai: 'openai',
  'openai-chat': 'openai',
  'openai-chatv2': 'openai',
  claude: 'claude',
  aphrodite: 'kobold',
  exllamav2: 'kobold',
  kobold: 'kobold',
  koboldcpp: 'kobold',
  llamacpp: 'ooba',
  ooba: 'ooba',
  tabby: 'kobold',
  mistral: 'kobold',
  ollama: 'kobold',
  vllm: 'kobold',
  featherless: 'kobold',
  gemini: 'kobold',
  arli: 'kobold',
  'lm-studio': 'openai',
}

export const BASIC_PROMPT_ONLY: { [svc in ThirdPartyFormat]?: boolean } = {
  featherless: true,
  gemini: true,
}

export const THIRDPARTY_FORMATS = [
  'kobold',
  'openai',
  'openai-chat',
  'openai-chatv2',
  'claude',
  'ooba',
  'llamacpp',
  'aphrodite',
  'exllamav2',
  'koboldcpp',
  'tabby',
  'mistral',
  'ollama',
  'vllm',
  'featherless',
  'arli',
  'gemini',
  'lm-studio',
] as const

export const AI_ADAPTERS = [
  'agnaistic',
  'third-party',
  'kobold',
  'novel',
  'ooba',
  'horde',
  'openai',
  'scale',
  'claude',
  'claude-v2',
  'goose',
  'replicate',
  'openrouter',
  'openrouter-completion',
  'mancer',
  'petals',
  'venus',
] as const
export const CHAT_ADAPTERS = ['default', ...AI_ADAPTERS] as const

export const MULTI_TENANT_ADAPTERS = ['novel', 'chai', 'kobold'] as const

export type NovelModel = keyof typeof NOVEL_MODELS

export type MistralModel = keyof typeof MISTRAL_MODELS

export type OpenAIModel = (typeof OPENAI_MODELS)[keyof typeof OPENAI_MODELS]

export const GOOSE_ENGINES = {
  'cassandra-lit-2-8b': 'Cassandra 2.8B',
  'cassandra-lit-6-9b': 'Cassandra 6.9B',
  'convo-6b': 'Convo 6B',
  'gpt-neo-20b': 'GPT Neo 20B',
  'gpt-j-6b': 'GPT-J 6B',
  'gpt-neo-2-7b': 'GPT-Neo 2.7B',
  'gpt-neo-1-3b': 'GPT-Neo 1.3B',
  'gpt-neo-125m': 'GPT-Neo 125M',
  'fairseq-13b': 'Fairseq 13B',
  'fairseq-6-7b': 'Fairseq 6.7B',
  'fairseq-2-7b': 'Fairseq 2.7B',
  'fairseq-1-3b': 'Fairseq 1.3B',
  'fairseq-125m': 'Fairseq 125M',
}

export const MISTRAL_MODELS = {
  OpenMistral7b: 'open-mistral-7b',
  OpenMixtral8x7b: 'open-mixtral-8x7b',
  MistralSmall: 'mistral-small-latest',
  MistralMedium: 'mistral-medium-latest',
  MistralLarge: 'mistral-large-latest',
  MistralLarge2411: 'mistral-large-2411',
} as const

export const FLAI_CONTEXTS: Record<string, number> = {
  'qwen2-72b-lc': 16 * 1024,
  'qwen2-32b-lc': 16 * 1024,
  'yi1.5-34b-lc': 16 * 1024,

  'llama31-70b-16k': 16 * 1024,
  'llama31-8b-16k': 16 * 1024,
  'llama3-70b-8k': 8 * 1024,
  'llama3-8b-8k': 8 * 1024,
  'llama2-13b-4k': 4 * 1024,
  'llama2-solar-10b7-4k': 4 * 1024,

  'mistral-nemo-12b-lc': 16 * 1024,
  'mixtral-8x22b-lc': 16 * 1024,
  'mistral-v02-7b-std-lc': 16 * 1024,

  'rwkv5-7b': 16 * 1024,
}

export type GoogleModel = keyof typeof GOOGLE_MODELS

export const GOOGLE_MODELS = {
  GEMINI_15_PRO: { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  GEMINI_10_PRO_LATEST: { id: 'gemini-1.0-pro-latest', label: 'Gemini 1.0 Pro' },
  GEMINI_15_FLASH: { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  GEMINI_15_FLASH_002: { id: 'gemini-1.5-flash-002', label: 'Gemini 1.5 Flash 002' },
  GEMINI_15_FLASH_8B: { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
  GEMINI_EXP_1114: { id: 'gemini-exp-1114', label: 'Gemini Exp 1114' },
  GEMINI_20_FLASH_EXP: { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp' },
  GEMINI_20_FLASH_THINKING: {
    id: 'gemini-2.0-flash-thinking-exp-01-21',
    label: 'Gemini 2.0 Flash Thinking',
  },
  GEMINI_20_PRO_0205: { id: 'gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 02/05' },
  GEMINI_25_PRO_0325: { id: 'gemini-2.5-pro-exp-03-25', label: 'Gemini 2.5 Pro Exp 03/25' },
  GEMINI_25_PRO: { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Latest)' },
  GEMINI_25_PRO_PREVIEW_0325: {
    id: 'gemini-2.5-pro-preview-03-25',
    label: 'Gemini 2.5 Pro Preview 03/25',
  },
  GEMINI_25_FLASH_0417: { id: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash 04/17' },
  GEMINI_25_FLASH_0520: { id: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash 05/20' },
  GEMINI_25_PRO_PREVIEW_0506: {
    id: 'gemini-2.5-pro-preview-05-06',
    label: 'Gemini 2.5 Pro Preview 05-06',
  },
}

export const GOOGLE_LIMITS: Record<string, number> = {
  'gemini-1.5-pro': 2097152,
  'gemini-1.0-pro-latest': 32768,
  'gemini-1.5-flash': 1048576,
  'gemini-1.5-flash-8b': 1048576,
  'gemini-2.0-flash-exp': 1048576,
  'gemini-2.5-pro-exp-03-25': 1000000,
  fallback: 1048576,
}

export const REPLICATE_MODEL_TYPES = {
  'Auto-detect': '',
  LLaMa: 'llama',
  StableLM: 'stablelm',
  'Open Assistant': 'openassistant',
} as const

export type OpenRouterModel = {
  id: string
  description: string
  pricing: { prompt: string; completion: string }
  context_length: number
}

export type HordeModel = {
  name: string
  count: number
  performance: number
  queued: number
  eta: number
  type?: string
}

export type HordeWorker = {
  id: string
  name: string
  type: 'text' | 'image'
  online: number
  max_length: number
  max_context_length: number

  requests_fulfilled: number
  kudos_rewards: number
  kudos_details: {
    generated: number
    uptime?: number
  }
  performance: string
  threads: number
  uptime: number
  maintenance_mode: boolean
  nsfw: boolean
  trusted: boolean
  flagged: false
  uncompleted_jobs: number
  models: string[]
  team: {
    name?: string
    id?: string
  }
  bridge_agent: string
}

export const ADAPTER_LABELS: { [key in AIAdapter]: string } = {
  horde: 'Horde',
  'third-party': 'Third-Party',
  kobold: 'Third-Party',
  novel: 'NovelAI',
  ooba: 'Textgen',
  openai: 'OpenAI',
  scale: 'Scale',
  'claude-v2': 'Claude (V2)',
  claude: 'Claude (Legacy)',
  goose: 'Goose AI',
  replicate: 'Replicate',
  openrouter: 'OpenRouter (Chat)',
  'openrouter-completion': 'OpenRouter (Completions)',
  mancer: 'Mancer',
  petals: 'Petals',
  agnaistic: 'Agnaistic',
  venus: 'Venus',
}

export const FORMAT_LABEL: { [key in ThirdPartyFormat]: string } = {
  kobold: 'Kobold',
  openai: 'OpenAI (Completion)',
  'openai-chat': 'OpenAI Compatible (Chat - Legacy)',
  'openai-chatv2': 'OpenAI Compatible (Chat)',
  aphrodite: 'Aphrodite',
  arli: 'ArliAI',
  claude: 'Claude (Legacy)',
  exllamav2: 'ExllamaV2',
  featherless: 'Featherless',
  gemini: 'Google AI Studio',
  koboldcpp: 'Kobold.cpp',
  llamacpp: 'Llama.cpp',
  mistral: 'Mistral AI',
  ollama: 'Ollama',
  ooba: 'TextGen WebUI (Ooba)',
  tabby: 'TabbyAPI',
  vllm: 'vLLM',
  'lm-studio': 'LM Studio',
}

export const INSTRUCT_SERVICES: { [key in AIAdapter]?: boolean } = {
  openai: true,
  openrouter: true,
  claude: true,
  scale: true,
  novel: true,
  agnaistic: true,
  mancer: true,
  kobold: true,
  ooba: true,
}

export type PresetAISettings = Omit<
  AppSchema.GenSettings,
  | 'name'
  | 'service'
  | 'images'
  | 'memoryDepth'
  | 'memoryContextLimit'
  | 'memoryReverseWeight'
  | 'src'
  | 'order'
>

export const samplerDisableValues: { [key in keyof PresetAISettings]?: number } = {
  dynatemp_range: 0,
  dynatemp_exponent: 0,
  minP: 0,
  smoothingFactor: 0,
  smoothingCurve: 1,
  topP: 1,
  topK: 0,
  topA: 0,
  mirostatTau: 0,
  mirostatLR: 0,
  typicalP: 1,
  repetitionPenalty: 1,
  repetitionPenaltySlope: 0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  tailFreeSampling: 1,
  xtcThreshold: 0,
  dryMultiplier: 0,
}

/**
 * Order of Precedence:
 * 1. chat.genPreset -> service
 * 2. chat.genSettings -> service
 * 3. chat.adapter
 * 4. user.defaultAdapter
 */
export function getAdapter(
  chat: AppSchema.Chat,
  user: AppSchema.User,
  preset: Partial<AppSchema.GenSettings> | undefined
) {
  let model = ''
  const conn = getPresetConnection(preset || {}, user.providers)
  const isThirdParty = isThirdPartyPreset(conn)
  let adapter = conn.service || 'third-party'

  if (adapter === 'kobold' || adapter === 'third-party') {
    adapter = THIRDPARTY_HANDLERS[user.thirdPartyFormat]
    model = conn.preset.thirdPartyModel || ''
  }

  let presetName = 'Fallback Preset'

  if (adapter === 'openrouter' || adapter === 'openrouter-completion') {
    model = preset?.openRouterModel?.id || ''
  }

  if (adapter === 'replicate') {
    model = preset?.replicateModelType || 'llama'
  }

  if (adapter === 'novel') {
    model = user.novelModel
  }

  if (adapter === 'openai') {
    model = preset?.thirdPartyModel || preset?.oaiModel || defaultPresets.openai.oaiModel
  }

  if (adapter === 'claude') {
    model = preset?.claudeModel || ''
  }

  if (isDefaultPreset(chat.genPreset)) {
    presetName = 'Built-in Preset'
  } else presetName = 'User Preset'

  return { adapter, model, preset: presetName, isThirdParty }
}

export function isThirdPartyPreset(conn: PresetConnection) {
  if (!conn.provider) {
    const isThirdParty =
      conn.format && conn.format in THIRDPARTY_HANDLERS && conn.service === 'kobold'
    return !!isThirdParty
  }

  if (conn.service === 'agnaistic') return false
  if (conn.service) return false

  return true
}

export function adaptersToOptions(adapters: AIAdapter[]) {
  return adapters.map((adp) => ({ label: ADAPTER_LABELS[adp], value: adp }))
}

export type RegisteredAdapter = {
  name: AIAdapter
  settings: AdapterSetting[]
  options: Array<keyof PresetAISettings>
  load?: (user?: AppSchema.User | null) => AdapterSetting[]
}

export const settingLabels: { [key in keyof PresetAISettings]: string } = {
  temp: 'Temperature',
  dynatemp_range: 'Dynamic Temperature Range',
  dynatemp_exponent: 'Dynamic Temperature Exponent',
  smoothingFactor: 'Smoothing Factor (Quadratic Sampling)',
  smoothingCurve: 'Smoothing Curve (Cubic Sampling)',
  maxTokens: 'Max Tokens (Response length)',
  repetitionPenalty: 'Repetition Penalty',
  repetitionPenaltyRange: 'Repetition Penality Range',
  repetitionPenaltySlope: 'Repetition Penalty Slope',
  tailFreeSampling: 'Tail Free Sampling',
  minP: 'Min P',
  topA: 'Top A',
  topK: 'Top K',
  topP: 'Top P',
  typicalP: 'Typical P',
  addBosToken: 'Add BOS Token',
  antiBond: 'Anti-bond',
  banEosToken: 'Ban EOS Token',
  claudeModel: 'Claude Model',
  encoderRepitionPenalty: 'Encoder Repetition Penalty',
  frequencyPenalty: 'Frequency Penalty',
  gaslight: 'Prompt Template',
  ignoreCharacterSystemPrompt: 'Ignore Character System Prompt',
  ignoreCharacterUjb: 'Ignore Character Jailbreak',
  maxContextLength: 'Max Context Length',
  memoryChatEmbedLimit: 'Memory: Chat Embed Context Limit',
  memoryUserEmbedLimit: 'Memory: User-specific Embed Context Limit',
  novelModel: 'NovelAI Model',
  oaiModel: 'OpenAI Model',
  thirdPartyModel: 'OpenAI Model Override',
  thirdPartyKey: 'Third Party Key/Password',
  openRouterModel: 'OpenRouter Model',
  penaltyAlpha: 'Penalty Alpha',
  presencePenalty: 'Presence Penalty',
  replicateModelName: 'Replicate Model',
  replicateModelType: 'Replicate Model Type',
  replicateModelVersion: 'Replicate Model Version',
  skipSpecialTokens: 'Skip Special Tokens',
  streamResponse: 'Stream Response',
  systemPrompt: 'System (Instruction) Prompt',
  thirdPartyFormat: 'Third Party Format',
  thirdPartyUrl: 'Third Party URL',
  ultimeJailbreak: 'Jailbreak',
  prefill: 'Bot response prefilling',
  phraseRepPenalty: 'Phrase Repetition Penality',
  stopSequences: 'Stop Sequences',
  trimStop: 'Trim Stop Sequences',
  mirostatTau: 'Mirostat Tau',
  mirostatLR: 'Mirostat LR',
  swipesPerGeneration: 'Swipes Per Generation',
  mirostatToggle: 'Mirostat Toggle',
  etaCutoff: 'ETA Cutoff',
  epsilonCutoff: 'Epsilon Cutoff',
  cfgScale: 'CFG Scale',
}

export const samplerOrders: { [key in AIAdapter]?: Array<keyof PresetAISettings> } = {
  kobold: ['topK', 'topA', 'topP', 'tailFreeSampling', 'typicalP', 'temp', 'repetitionPenalty'],
  novel: [
    'temp',
    'topK',
    'topP',
    'tailFreeSampling',
    'topA',
    'typicalP',
    'cfgScale',
    'mirostatTau',
  ],
}

export type AIAdapter = (typeof AI_ADAPTERS)[number]
export type ChatAdapter = (typeof CHAT_ADAPTERS)[number]
export type PersonaFormat = (typeof PERSONA_FORMATS)[number]
export type ThirdPartyFormat = (typeof THIRDPARTY_FORMATS)[number]
