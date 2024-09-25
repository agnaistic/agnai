import { OPENAI_MODELS } from '../adapters'
import { AppSchema } from '../types'
import { templates } from './templates'

export const agnaiPresets = {
  agnai: {
    service: 'agnaistic',
    name: 'Agnaistic',
    maxTokens: 400,
    maxContextLength: 8192,
    repetitionPenalty: 1,
    repetitionPenaltySlope: 0,
    repetitionPenaltyRange: 512,
    temp: 0.8,
    topK: 0,
    topP: 1,
    typicalP: 1,
    topA: 0,
    minP: 0,
    tailFreeSampling: 1,
    encoderRepitionPenalty: 1.0,
    penaltyAlpha: 0,
    addBosToken: true,
    banEosToken: false,
    skipSpecialTokens: true,
    frequencyPenalty: 0,
    presencePenalty: 0,
    gaslight: templates.Alpaca,
    ultimeJailbreak: '',
    oaiModel: OPENAI_MODELS.Turbo,
    streamResponse: true,
    memoryDepth: 50,
    memoryContextLimit: 500,
    memoryReverseWeight: false,
    antiBond: false,
    useAdvancedPrompt: 'basic',
    promptOrderFormat: 'Alpaca',
    promptOrder: [
      {
        placeholder: 'system_prompt',
        enabled: true,
      },
      {
        placeholder: 'scenario',
        enabled: true,
      },
      {
        placeholder: 'personality',
        enabled: true,
      },
      {
        placeholder: 'impersonating',
        enabled: true,
      },
      {
        placeholder: 'chat_embed',
        enabled: true,
      },
      {
        placeholder: 'memory',
        enabled: true,
      },
      {
        placeholder: 'example_dialogue',
        enabled: true,
      },
      {
        placeholder: 'history',
        enabled: true,
      },
      {
        placeholder: 'ujb',
        enabled: true,
      },
    ],
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
