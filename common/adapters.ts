export type ChatAdapter = (typeof CHAT_ADAPTERS)[number]

export const CHAT_ADAPTERS = ['default', 'kobold', 'novel', 'chai'] as const
export const MULTI_TENANT_ADAPTERS = ['novel', 'chai', 'kobold'] as const

export type NovelModel = keyof typeof NOVEL_MODELS

export const NOVEL_MODELS = {
  euterpe: 'euterpe-v2',
  krake: 'krake-v2',
} satisfies { [key: string]: string }
