import { AppSchema } from '../types/schema'

export const oobaPresets = {
  llama: {
    name: 'Llama (TextGen)',
    service: 'ooba',
    maxTokens: 80,
    maxContextLength: 2048,
    repetitionPenalty: 1.2,
    encoderRepitionPenalty: 1,
    penaltyAlpha: 0,
    temp: 0.7,
    topK: 40,
    topP: 0.5,
    typicalP: 1,
    useGaslight: false,
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
