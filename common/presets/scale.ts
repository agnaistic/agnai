import { AppSchema } from '/srv/db/schema'

export const scalePresets = {
  scale: {
    name: 'Scale',
    service: 'scale',
    maxTokens: 300,
    maxContextLength: 7600,
    // Not providing a default gaslight intentionally as most users have thier gaslight configured within Scale.
    gaslight: ``,
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
