export type AIAdapter = (typeof AI_ADAPTERS)[number]
export type ChatAdapter = (typeof CHAT_ADAPTERS)[number]
export type PersonaFormat = (typeof PERSONA_FORMATS)[number]

export const PERSONA_FORMATS = ['boostyle', 'wpp', 'sbf'] as const

export const PERSONA_LABELS: { [key in PersonaFormat]: string } = {
  boostyle: 'Boostyle',
  wpp: 'W++',
  sbf: 'SBF',
}

export const AI_ADAPTERS = ['kobold', 'novel', 'chai', 'ooba', 'horde'] as const
export const CHAT_ADAPTERS = ['default', ...AI_ADAPTERS] as const

export const MULTI_TENANT_ADAPTERS = ['novel', 'chai', 'kobold'] as const

export type NovelModel = keyof typeof NOVEL_MODELS

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

export const ADAPTER_LABELS: Record<AIAdapter, string> = {
  chai: 'Chai',
  horde: 'Horde',
  kobold: 'Kobold',
  novel: 'NovelAI',
  ooba: 'Text-Generation-WebUI',
}
