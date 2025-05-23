import { AppSchema } from '../types/schema'

const localDefault = {
  service: 'kobold',
  thirdPartyFormat: 'openai-chatv2',
  localRequests: true,
  useMaxContext: false,
  presetMode: 'advanced',
  maxTokens: 500,
  maxContextLength: 16 * 1024,
  repetitionPenalty: 1,
  repetitionPenaltySlope: 1,
  repetitionPenaltyRange: 1024,
  temp: 0.8,
  topK: 0,
  topP: 1,
  minP: 0.02,
  typicalP: 1,
  topA: 0,
  tailFreeSampling: 1,
  encoderRepitionPenalty: 1.0,
  penaltyAlpha: 0,
  addBosToken: true,
  banEosToken: false,
  skipSpecialTokens: true,
  streamResponse: true,
  memoryDepth: 50,
  memoryContextLimit: 500,
  memoryReverseWeight: false,
} as const

export const koboldPresets = {
  llama_cpp: {
    ...localDefault,
    name: 'Local Llama.cpp',
    thirdPartyUrl: 'http://localhost:8080/v1',
  },
  kobold_cpp: {
    ...localDefault,
    name: 'Local Kobold.cpp',
    thirdPartyUrl: 'http://localhost:5001/v1',
  },
  ollama: {
    ...localDefault,
    name: 'Local Ollama',
    thirdPartyUrl: 'http://localhost:11434/v1',
  },
  lm_studio: {
    ...localDefault,
    name: 'Local LM Studio',
    thirdPartyUrl: 'http://localhost:1235/v1',
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
