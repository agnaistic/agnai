export type ChatAdapter = (typeof ADAPTERS)[number]

export const ADAPTERS = ['default', 'kobold', 'novel', 'chai'] as const
