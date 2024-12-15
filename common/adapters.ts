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
  simple: {
    maxContextLength: true,
    maxTokens: true,
    modelFormat: true,
    ultimeJailbreak: true,
    streamResponse: true,
    temp: true,
    localRequests: true,
    openRouterModel: true,
    oaiModel: true,
    thirdPartyModel: true,
    claudeModel: true,
    novelModel: true,
    mistralModel: true,
    stopSequences: true,
    thirdPartyKey: true,
    thirdPartyFormat: true,
    thirdPartyUrl: true,
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
] as const

export const AI_ADAPTERS = [
  'agnaistic',
  'kobold',
  'novel',
  'ooba',
  'horde',
  'openai',
  'scale',
  'claude',
  'goose',
  'replicate',
  'openrouter',
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

export const OPENAI_MODELS = {
  DaVinci: 'text-davinci-003',
  Turbo: 'gpt-3.5-turbo',
  Turbo0301: 'gpt-3.5-turbo-0301',
  Turbo0613: 'gpt-3.5-turbo-0613',
  Turbo1106: 'gpt-3.5-turbo-1106',
  Turbo_16k: 'gpt-3.5-turbo-16k',
  Turbo_Instruct: 'gpt-3.5-turbo-instruct',
  Turbo_Intruct914: 'gpt-3.5-turbo-instruct-0914',
  GPT4: 'gpt-4',
  GPT4_0314: 'gpt-4-0314',
  GPT4_0613: 'gpt-4-0613',
  GPT4_32k: 'gpt-4-32k',
  GPT4_32k_0314: 'gpt-4-32k-0314',
  GPT4_32k_0613: 'gpt-4-32k-0613',
  GPT45_1106: 'gpt-4-1106-preview',
  GPT45_0125: 'gpt-4-0125-preview',
  GPT45_Preview: 'gpt-4-turbo-preview',
  GPT4_Turbo_Preview: 'gpt-4-turbo-preview',
  GPT4_Turbo: 'gpt-4-turbo',
  GPT4_Turbo_0409: 'gpt-4-turbo-2024-04-09',
  GPT4_Omni: 'gpt-4o',
  GPT4_Omni_Mini: 'gpt-4o-mini',
  GPT4_Omni_0806: 'gpt-4o-2024-08-06',
  GPT4_Omni_Latest: 'chatgpt-4o-latest',
  O1_Preview: 'o1-preview',
  O1_Preview_20240912: 'o1-preview-2024-09-12',
  O1_Mini: 'o1-mini',
  O1_Mini_20240912: '1-mini-2024-09-12',
} as const

export const MISTRAL_MODELS = {
  OpenMistral7b: 'open-mistral-7b',
  OpenMixtral8x7b: 'open-mixtral-8x7b',
  MistralSmall: 'mistral-small-latest',
  MistralMedium: 'mistral-medium-latest',
  MistralLarge: 'mistral-large-latest',
  MistralLarge2411: 'mistral-large-2411',
} as const

export const OPENAI_CONTEXTS: Record<string, number> = {
  [OPENAI_MODELS.Turbo]: 16300,
  [OPENAI_MODELS.Turbo0613]: 16300,
  [OPENAI_MODELS.Turbo1106]: 16300,
  [OPENAI_MODELS.Turbo_16k]: 16300,
  [OPENAI_MODELS.GPT4]: 8100,
  [OPENAI_MODELS.GPT4_0314]: 8100,
  [OPENAI_MODELS.GPT4_0613]: 8100,
  [OPENAI_MODELS.GPT4_32k]: 32000,
  [OPENAI_MODELS.GPT4_32k_0314]: 32000,
  [OPENAI_MODELS.GPT4_32k_0613]: 32000,
  [OPENAI_MODELS.GPT45_1106]: 128000,
  [OPENAI_MODELS.GPT45_0125]: 128000,
  [OPENAI_MODELS.GPT45_Preview]: 128000,
  [OPENAI_MODELS.GPT4_Turbo_0409]: 128000,
  [OPENAI_MODELS.GPT4_Omni]: 120000,
}

export const OPENAI_CHAT_MODELS: Record<string, boolean> = {
  [OPENAI_MODELS.Turbo]: true,
  [OPENAI_MODELS.Turbo0301]: true,
  [OPENAI_MODELS.Turbo0613]: true,
  [OPENAI_MODELS.Turbo1106]: true,
  [OPENAI_MODELS.Turbo_16k]: true,
  [OPENAI_MODELS.GPT4]: true,
  [OPENAI_MODELS.GPT4_0314]: true,
  [OPENAI_MODELS.GPT4_0613]: true,
  [OPENAI_MODELS.GPT4_32k]: true,
  [OPENAI_MODELS.GPT4_32k_0314]: true,
  [OPENAI_MODELS.GPT4_32k_0613]: true,
  [OPENAI_MODELS.GPT45_1106]: true,
  [OPENAI_MODELS.GPT45_0125]: true,
  [OPENAI_MODELS.GPT45_Preview]: true,
  [OPENAI_MODELS.GPT4_Turbo_0409]: true,
  [OPENAI_MODELS.GPT4_Omni]: true,
  [OPENAI_MODELS.GPT4_Omni_Mini]: true,
  [OPENAI_MODELS.GPT4_Omni_0806]: true,
  [OPENAI_MODELS.GPT4_Omni_Latest]: true,
  [OPENAI_MODELS.O1_Preview]: true,
  [OPENAI_MODELS.O1_Preview_20240912]: true,
  [OPENAI_MODELS.O1_Mini]: true,
  [OPENAI_MODELS.O1_Mini_20240912]: true,
}

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
  GEMINI_20_FLASH: { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' },
}

export const GOOGLE_LIMITS: Record<string, number> = {
  'gemini-1.5-pro': 2097152,
  'gemini-1.0-pro-latest': 32768,
  'gemini-1.5-flash': 1048576,
  'gemini-1.5-flash-8b': 1048576,
  'gemini-2.0-flash-exp': 1048576,
}

/** Note: claude-v1 and claude-instant-v1 not included as they may point
 * to different models in the future. New models may be less appropriate
 * for roleplaying so they should be updated to manually
 * <https://console.anthropic.com/docs/api/reference#-v1-complete>
 */
export const CLAUDE_MODELS = {
  ClaudeV1: 'claude-v1',
  ClaudeV2: 'claude-2',
  ClaudeV2_0: 'claude-2.0',
  ClaudeV2_1: 'claude-2.1',
  ClaudeV1_100k: 'claude-v1-100k',
  ClaudeV1_0: 'claude-v1.0',
  ClaudeV1_2: 'claude-v1.2',
  ClaudeV1_3: 'claude-v1.3',
  ClaudeV1_3_100k: 'claude-v1.3-100k',
  ClaudeInstantV1: 'claude-instant-v1',
  ClaudeInstantV1_100k: 'claude-instant-v1-100k',
  ClaudeInstantV1_0: 'claude-instant-v1.0',
  ClaudeInstantV1_1: 'claude-instant-v1.1',
  ClaudeInstantV1_1_100k: 'claude-instant-v1.1-100k',
  ClaudeV3_Opus: 'claude-3-opus-20240229',
  ClaudeV3_Sonnet: 'claude-3-sonnet-20240229',
  ClaudeV3_Haiku: 'claude-3-haiku-20240307',
  ClaudeV35_Haiku_Oct2024: 'claude-3-5-haiku-20241022',
  ClaudeV35_Haiku_Latest: 'claude-3-5-haiku-latest',
  ClaudeV35_Sonnet: 'claude-3-5-sonnet-20240620',
  ClaudeV35_Sonnet_Oct2024: 'claude-3-5-sonnet-20241022',
  ClaudeV35_Sonnet_Latest: 'claude-3-5-sonnet-latest',
} as const

export const CLAUDE_CHAT_MODELS: Record<string, boolean> = {
  [CLAUDE_MODELS.ClaudeV3_Opus]: true,
  [CLAUDE_MODELS.ClaudeV3_Sonnet]: true,
  [CLAUDE_MODELS.ClaudeV3_Haiku]: true,
  [CLAUDE_MODELS.ClaudeV35_Sonnet]: true,
  [CLAUDE_MODELS.ClaudeV35_Sonnet_Oct2024]: true,
  [CLAUDE_MODELS.ClaudeV35_Sonnet_Latest]: true,
  [CLAUDE_MODELS.ClaudeV35_Haiku_Oct2024]: true,
  [CLAUDE_MODELS.ClaudeV35_Haiku_Latest]: true,
}

export const NOVEL_MODELS = {
  'llama-3-erato-v1': 'erato-v1',
  euterpe: 'euterpe-v2',
  krake: 'krake-v2',
  clio_v1: 'clio-v1',
  kayra_v1: 'kayra-v1',
} satisfies { [key: string]: string }

export const NOVEL_ALIASES: Record<string, string> = {
  'erato-v1': 'llama-3-erato-v1',
}

export const REPLICATE_MODEL_TYPES = {
  'Auto-detect': '',
  LLaMa: 'llama',
  StableLM: 'stablelm',
  'Open Assistant': 'openassistant',
} as const

export type OpenRouterModel = {
  id: string
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
  kobold: 'Third-Party / Self-Host',
  novel: 'NovelAI',
  ooba: 'Textgen',
  openai: 'OpenAI',
  scale: 'Scale',
  claude: 'Claude',
  goose: 'Goose AI',
  replicate: 'Replicate',
  openrouter: 'OpenRouter',
  mancer: 'Mancer',
  petals: 'Petals',
  agnaistic: 'Agnaistic',
  venus: 'Venus',
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
