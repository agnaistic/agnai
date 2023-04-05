export type AIAdapter = (typeof AI_ADAPTERS)[number]
export type ChatAdapter = (typeof CHAT_ADAPTERS)[number]
export type PersonaFormat = (typeof PERSONA_FORMATS)[number]

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
  'chai',
  'ooba',
  'horde',
  'luminai',
  'openai',
  'scale',
  'claude',
] as const
export const CHAT_ADAPTERS = ['default', ...AI_ADAPTERS] as const

export const MULTI_TENANT_ADAPTERS = ['novel', 'chai', 'kobold'] as const

export type NovelModel = keyof typeof NOVEL_MODELS

export type OpenAIModel = (typeof OPENAI_MODELS)[keyof typeof OPENAI_MODELS]

export const OPENAI_MODELS = {
  DaVinci: 'text-davinci-003',
  Turbo: 'gpt-3.5-turbo',
  GPT4: 'gpt-4',
} as const

/** Note: I'm claude-v1 and claude-instant-v1 not included as they may point
 * to different models in the future. Any new model names should be added manually.
 * <https://console.anthropic.com/docs/api/reference#-v1-complete>
 */
export const CLAUDE_MODELS = {
  'claude-v1.0': 'claude-v1.0',
  'claude-v1.2': 'claude-v1.2',
  'claude-instant-v1.0': 'claude-instant-v1.0',
} as const

export const NOVEL_MODELS = {
  euterpe: 'euterpe-v2',
  krake: 'krake-v2',
} satisfies { [key: string]: string }

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

export const ADAPTER_LABELS: Record<AIAdapter, string> = {
  chai: 'Chai',
  horde: 'Horde',
  kobold: 'Kobold',
  novel: 'NovelAI',
  ooba: 'Text-Generation-WebUI',
  luminai: 'LuminAI',
  openai: 'OpenAI',
  scale: 'Scale',
  claude: 'Claude',
}
