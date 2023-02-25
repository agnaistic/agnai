export type ChatAdapter = (typeof ADAPTERS)[number]

export const ADAPTERS = ['default', 'kobold', 'novel', 'chai'] as const
export const MULTI_TENANT_ADAPTERS = ['novel', 'chai'] as const

export type NovelModel = keyof typeof NOVEL_MODELS

export const NOVEL_MODELS = {
  euterpe: 'euterpe-v2',
  krake: 'krake-v2',
} satisfies { [key: string]: string }
