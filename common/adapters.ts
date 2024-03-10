import { AppSchema } from './types/schema'

export type AIAdapter = (typeof AI_ADAPTERS)[number]
export type ChatAdapter = (typeof CHAT_ADAPTERS)[number]
export type PersonaFormat = (typeof PERSONA_FORMATS)[number]
export type ThirdPartyFormat = (typeof THIRDPARTY_FORMATS)[number]

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

export const PERSONA_FORMATS = ['boostyle', 'wpp', 'sbf', 'attributes', 'text'] as const

export const PERSONA_LABELS: { [key in PersonaFormat]: string } = {
  boostyle: 'Boostyle',
  wpp: 'W++',
  sbf: 'SBF',
  attributes: 'Attributes (NovelAI)',
  text: 'Plain Text',
}

export const THIRDPARTY_HANDLERS: { [svc in ThirdPartyFormat]: AIAdapter } = {
  openai: 'openai',
  'openai-chat': 'openai',
  claude: 'claude',
  aphrodite: 'kobold',
  exllamav2: 'kobold',
  kobold: 'kobold',
  koboldcpp: 'kobold',
  llamacpp: 'ooba',
  ooba: 'ooba',
  tabby: 'kobold',
  mistral: 'kobold',
}

export const THIRDPARTY_FORMATS = [
  'kobold',
  'openai',
  'openai-chat',
  'claude',
  'ooba',
  'llamacpp',
  'aphrodite',
  'exllamav2',
  'koboldcpp',
  'tabby',
  'mistral',
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
  GPT45_Preview: 'gpt-4-turbo-preview', // latest GPT 4 Turbo
} as const

export const MISTRAL_MODELS = {
  OpenMistral7b: 'open-mistral-7b',
  OpenMixtral8x7b: 'open-mixtral-8x7b',
  MistralSmall: 'mistral-small-latest',
  MistralMedium: 'mistral-medium-latest',
  MistralLarge: 'mistral-large-latest',
} as const

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
} as const

export const CLAUDE_CHAT_MODELS: Record<string, boolean> = {
  [CLAUDE_MODELS.ClaudeV3_Opus]: true,
  [CLAUDE_MODELS.ClaudeV3_Sonnet]: true,
}

export const NOVEL_MODELS = {
  euterpe: 'euterpe-v2',
  krake: 'krake-v2',
  clio_v1: 'clio-v1',
  kayra_v1: 'kayra-v1',
} satisfies { [key: string]: string }

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
  kobold: 'Self-host / 3rd Party',
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

/**
 * This is al
 */
export const adapterSettings: {
  [key in keyof PresetAISettings]: Array<AIAdapter | ThirdPartyFormat>
} = {
  temp: [
    'kobold',
    'novel',
    'ooba',
    'horde',
    'openai',
    'scale',
    'claude',
    'goose',
    'agnaistic',
    'aphrodite',
    'tabby',
    'mistral',
  ],
  dynatemp_range: ['kobold', 'aphrodite', 'ooba', 'tabby'],
  dynatemp_exponent: ['kobold', 'aphrodite', 'ooba', 'tabby'],
  smoothingFactor: ['kobold', 'aphrodite', 'ooba', 'tabby'],
  maxTokens: AI_ADAPTERS.slice(),
  maxContextLength: AI_ADAPTERS.slice(),
  antiBond: ['openai', 'scale'],
  prefixNameAppend: ['openai', 'claude'],

  swipesPerGeneration: ['aphrodite'],
  epsilonCutoff: ['aphrodite'],
  etaCutoff: ['aphrodite'],

  prefill: ['claude'],

  topP: [
    'horde',
    'kobold',
    'claude',
    'ooba',
    'openai',
    'novel',
    'agnaistic',
    'exllamav2',
    'openai-chat',
    'aphrodite',
    'tabby',
    'mistral',
  ],
  repetitionPenalty: [
    'horde',
    'novel',
    'kobold',
    'ooba',
    'agnaistic',
    'exllamav2',
    'aphrodite',
    'tabby',
  ],
  repetitionPenaltyRange: ['horde', 'novel', 'kobold', 'ooba', 'agnaistic', 'tabby'],
  repetitionPenaltySlope: ['horde', 'novel', 'kobold'],
  tailFreeSampling: ['horde', 'novel', 'kobold', 'ooba', 'agnaistic', 'aphrodite', 'tabby'],
  minP: ['llamacpp', 'kobold', 'koboldcpp', 'exllamav2', 'ooba', 'agnaistic', 'aphrodite', 'tabby'],
  topA: ['horde', 'novel', 'kobold', 'ooba', 'agnaistic', 'aphrodite', 'tabby'],
  topK: [
    'horde',
    'novel',
    'kobold',
    'ooba',
    'claude',
    'agnaistic',
    'exllamav2',
    'aphrodite',
    'tabby',
  ],
  typicalP: ['horde', 'novel', 'kobold', 'ooba', 'agnaistic', 'exllamav2', 'aphrodite', 'tabby'],

  mirostatToggle: ['aphrodite', 'tabby'],
  mirostatLR: ['novel', 'ooba', 'agnaistic', 'llamacpp', 'aphrodite', 'tabby'],
  mirostatTau: ['novel', 'ooba', 'agnaistic', 'llamacpp', 'aphrodite', 'tabby'],
  cfgScale: ['novel', 'ooba', 'tabby'],
  cfgOppose: ['novel', 'ooba', 'tabby'],
  phraseRepPenalty: ['novel'],
  phraseBias: ['novel'],

  thirdPartyUrl: ['kobold', 'ooba'],
  thirdPartyFormat: ['kobold'],
  thirdPartyModel: ['openai', 'openai-chat', 'aphrodite', 'tabby'],
  thirdPartyKey: ['kobold', 'aphrodite', 'tabby', 'openai', 'openai-chat'],

  claudeModel: ['claude'],
  novelModel: ['novel'],
  mistralModel: ['mistral'],
  oaiModel: ['openai', 'openai-chat'],
  frequencyPenalty: ['openai', 'kobold', 'novel', 'agnaistic', 'openai-chat', 'aphrodite', 'tabby'],
  presencePenalty: ['openai', 'kobold', 'novel', 'openai-chat', 'aphrodite', 'tabby'],
  streamResponse: [
    'openai',
    'kobold',
    'novel',
    'claude',
    'ooba',
    'agnaistic',
    'openai-chat',
    'aphrodite',
    'tabby',
    'mistral',
  ],
  openRouterModel: ['openrouter'],
  stopSequences: [
    'ooba',
    'agnaistic',
    'novel',
    'mancer',
    'llamacpp',
    'horde',
    'exllamav2',
    'kobold',
    'aphrodite',
    'tabby',
  ],
  trimStop: ['koboldcpp'],

  addBosToken: ['ooba', 'agnaistic', 'tabby'],
  banEosToken: ['ooba', 'agnaistic', 'aphrodite', 'tabby'],
  doSample: ['ooba', 'agnaistic'],
  encoderRepitionPenalty: ['ooba'],
  penaltyAlpha: ['ooba'],
  earlyStopping: ['ooba'],
  numBeams: ['ooba'],

  replicateModelName: ['replicate'],
  replicateModelVersion: ['replicate'],
  replicateModelType: ['replicate'],

  skipSpecialTokens: ['ooba', 'kobold'],
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
  cfgOppose: 'CFG Opposing Prompt',
  cfgScale: 'CFG Scale',
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
