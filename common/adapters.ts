import { AppSchema } from './types/schema'

export type AIAdapter = (typeof AI_ADAPTERS)[number]
export type ChatAdapter = (typeof CHAT_ADAPTERS)[number]
export type PersonaFormat = (typeof PERSONA_FORMATS)[number]

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
}

export const PERSONA_FORMATS = ['boostyle', 'wpp', 'sbf', 'text'] as const

export const PERSONA_LABELS: { [key in PersonaFormat]: string } = {
  boostyle: 'Boostyle',
  wpp: 'W++',
  sbf: 'SBF',
  text: 'Plain Text',
}

export const AI_ADAPTERS = [
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
] as const
export const CHAT_ADAPTERS = ['default', ...AI_ADAPTERS] as const

export const MULTI_TENANT_ADAPTERS = ['novel', 'chai', 'kobold'] as const

export type NovelModel = keyof typeof NOVEL_MODELS

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
  Turbo_16k: 'gpt-3.5-turbo-16k',
  GPT4: 'gpt-4',
  GPT4_0314: 'gpt-4-0314',
  GPT4_0613: 'gpt-4-0613',
  GPT4_32k: 'gpt-4-32k',
  GPT4_32k_0314: 'gpt-4-32k-0314',
  GPT4_32k_0613: 'gpt-4-32k-0613',
} as const

export const OPENAI_CHAT_MODELS: Record<string, boolean> = {
  [OPENAI_MODELS.Turbo]: true,
  [OPENAI_MODELS.Turbo0301]: true,
  [OPENAI_MODELS.Turbo0613]: true,
  [OPENAI_MODELS.Turbo_16k]: true,
  [OPENAI_MODELS.GPT4]: true,
  [OPENAI_MODELS.GPT4_0314]: true,
  [OPENAI_MODELS.GPT4_0613]: true,
  [OPENAI_MODELS.GPT4_32k]: true,
  [OPENAI_MODELS.GPT4_32k_0314]: true,
  [OPENAI_MODELS.GPT4_32k_0613]: true,
}

/** Note: claude-v1 and claude-instant-v1 not included as they may point
 * to different models in the future. New models may be less appropriate
 * for roleplaying so they should be updated to manually
 * <https://console.anthropic.com/docs/api/reference#-v1-complete>
 */
export const CLAUDE_MODELS = {
  ClaudeV1: 'claude-v1',
  ClaudeV2: 'claude-2',
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
} as const

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
  kobold: 'Kobold / 3rd Party',
  novel: 'NovelAI',
  ooba: 'Textgen',
  openai: 'OpenAI',
  scale: 'Scale',
  claude: 'Claude',
  goose: 'Goose AI',
  replicate: 'Replicate',
  openrouter: 'OpenRouter',
  mancer: 'Mancer',
}

export const INSTRUCT_SERVICES: { [key in AIAdapter]?: boolean } = {
  openai: true,
  openrouter: true,
  claude: true,
  scale: true,
  novel: true,
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
  | 'useGaslight'
>

/**
 * This is al
 */
export const adapterSettings: {
  [key in keyof PresetAISettings]: AIAdapter[]
} = {
  temp: ['kobold', 'novel', 'ooba', 'horde', 'openai', 'scale', 'claude', 'goose'],
  maxTokens: AI_ADAPTERS.slice(),
  maxContextLength: AI_ADAPTERS.slice(),
  antiBond: ['openai', 'scale'],

  gaslight: ['openai', 'novel', 'scale', 'kobold', 'claude', 'ooba', 'goose', 'openrouter'],
  systemPrompt: ['openai', 'novel', 'scale', 'kobold', 'claude', 'ooba', 'goose', 'openrouter'],
  ignoreCharacterSystemPrompt: [
    'openai',
    'novel',
    'scale',
    'kobold',
    'claude',
    'ooba',
    'goose',
    'openrouter',
  ],
  ultimeJailbreak: ['openai', 'claude', 'kobold', 'scale', 'openrouter', 'novel'],
  prefill: ['claude'],
  ignoreCharacterUjb: ['openai', 'claude', 'kobold', 'openrouter'],

  topP: ['horde', 'kobold', 'claude', 'ooba', 'openai', 'novel'],
  repetitionPenalty: ['horde', 'novel', 'kobold', 'ooba'],
  repetitionPenaltyRange: ['horde', 'novel', 'kobold'],
  repetitionPenaltySlope: ['horde', 'novel', 'kobold'],
  tailFreeSampling: ['horde', 'novel', 'kobold'],
  topA: ['horde', 'novel', 'kobold'],
  topK: ['horde', 'novel', 'kobold', 'ooba', 'claude'],
  typicalP: ['horde', 'novel', 'kobold', 'ooba'],

  topG: ['novel'],
  mirostatLR: ['novel'],
  mirostatTau: ['novel'],
  cfgScale: ['novel'],
  cfgOppose: ['novel'],

  thirdPartyUrl: ['kobold', 'ooba'],
  thirdPartyFormat: ['kobold'],
  claudeModel: ['claude', 'kobold'],
  novelModel: ['novel'],
  oaiModel: ['openai', 'kobold'],
  frequencyPenalty: ['openai', 'kobold', 'novel'],
  presencePenalty: ['openai', 'kobold', 'novel'],
  streamResponse: ['openai', 'kobold', 'novel', 'claude', 'ooba'],
  openRouterModel: ['openrouter'],

  addBosToken: ['ooba'],
  banEosToken: ['ooba'],
  encoderRepitionPenalty: ['ooba'],
  penaltyAlpha: ['ooba'],

  replicateModelVersion: ['replicate'],
  replicateModelType: ['replicate'],

  skipSpecialTokens: ['ooba', 'kobold'],
}

export type RegisteredAdapter = {
  name: AIAdapter
  settings: AdapterSetting[]
  options: Array<keyof PresetAISettings>
}

export const settingLabels: { [key in keyof PresetAISettings]: string } = {
  temp: 'Temperature',
  maxTokens: 'Max Tokens (Response length)',
  repetitionPenalty: 'Repetition Penalty',
  repetitionPenaltyRange: 'Repetition Penality Range',
  repetitionPenaltySlope: 'Repetition Penalty Slope',
  tailFreeSampling: 'Tail Free Sampling',
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
  useTemplateParser: 'Use V2 Prompt Parser',
  topG: 'Top G',
  mirostatTau: 'Mirostat Tau',
  mirostatLR: 'Mirostat LR',
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
    'topG',
    'mirostatTau',
  ],
}
