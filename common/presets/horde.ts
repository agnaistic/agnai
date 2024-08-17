import { OPENAI_MODELS } from '../adapters'
import { AppSchema } from '../types/schema'

export const hordePresets = {
  horde: {
    name: 'Horde',
    service: 'horde',
    maxTokens: 80,
    maxContextLength: 1024,
    repetitionPenalty: 1.08,
    repetitionPenaltySlope: 0.9,
    repetitionPenaltyRange: 1024,
    temp: 0.65,
    topK: 0,
    topP: 0.9,
    typicalP: 1,
    topA: 1,
    tailFreeSampling: 0.9,
    order: [6, 0, 1, 2, 3, 4, 5],
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    gaslight: '',
    ultimeJailbreak: '',
    oaiModel: OPENAI_MODELS.Turbo,
    streamResponse: true,
    memoryDepth: 50,
    memoryContextLimit: 256,
    memoryReverseWeight: false,
    antiBond: false,
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
