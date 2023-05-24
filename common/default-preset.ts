import { AppSchema } from '../srv/db/schema'
import { CLAUDE_MODELS, OPENAI_MODELS } from './adapters'

const MAX_TOKENS = 80

const builtinPresets = {
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
    streamResponse: false,
    memoryDepth: 50,
    memoryContextLimit: 256,
    memoryReverseWeight: false,
    useGaslight: false,
    antiBond: false,
  },
  basic: {
    service: 'kobold',
    name: 'Simple',
    maxTokens: MAX_TOKENS,
    maxContextLength: 2048,
    repetitionPenalty: 1.08,
    repetitionPenaltySlope: 0.9,
    repetitionPenaltyRange: 1024,
    temp: 0.65,
    topK: 0,
    topP: 0.9,
    typicalP: 1,
    topA: 1,
    tailFreeSampling: 0.9,
    encoderRepitionPenalty: 1.0,
    penaltyAlpha: 0,
    addBosToken: true,
    banEosToken: false,
    order: [0, 1, 2, 3, 4, 5, 6],
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    gaslight: '',
    ultimeJailbreak: '',
    oaiModel: OPENAI_MODELS.Turbo,
    streamResponse: false,
    memoryDepth: 50,
    memoryContextLimit: 500,
    memoryReverseWeight: false,
    useGaslight: false,
    antiBond: false,
  },
  novel_clio: {
    name: 'Novel Clio - Talker C',
    service: 'novel',
    maxTokens: 300,
    maxContextLength: 8000,
    repetitionPenalty: 1.5,
    repetitionPenaltyRange: 8000,
    frequencyPenalty: 0.03,
    presencePenalty: 0.005,
    temp: 1.05,
    tailFreeSampling: 0.989,
    topK: 79,
    topP: 0.96,
    topA: 0.075,
    order: [1, 3, 4, 0, 2],
    useGaslight: false,
    streamResponse: false,
  },
  novel_20BC: {
    name: 'Novel 20BC+',
    service: 'novel',
    maxTokens: MAX_TOKENS,
    maxContextLength: 2048,
    repetitionPenalty: 1.055,
    repetitionPenaltyRange: 2048,
    repetitionPenaltySlope: 3.33,
    temp: 0.65,
    tailFreeSampling: 0.879,
    topK: 20,
    topP: 1,
    order: [0, 1, 2, 3],
    useGaslight: false,
  },
  novel_blueLighter: {
    name: 'Novel Blue Lighter',
    service: 'novel',
    maxTokens: MAX_TOKENS,
    maxContextLength: 2048,
    repetitionPenalty: 1.05,
    repetitionPenaltyRange: 560,
    repetitionPenaltySlope: 0,
    temp: 1.33,
    tailFreeSampling: 0.937,
    topK: 1,
    topP: 1,
    typicalP: 0.965,
    topA: 0.085,
    order: [3, 4, 5, 2, 0],
    useGaslight: false,
  },
  llama: {
    name: 'Llama (TextGen)',
    service: 'ooba',
    maxTokens: MAX_TOKENS,
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
  openai: {
    name: 'OpenAI - Turbo',
    service: 'openai',
    temp: 0.5,
    oaiModel: OPENAI_MODELS.Turbo,
    streamResponse: false,
    maxTokens: 300,
    maxContextLength: 4095,
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    antiBond: false,
    useGaslight: false,
    gaslight: `Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)
Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk
{{example_dialogue}}`,
  },
  openaiAlt: {
    name: 'OpenAI - Turbo (#2)',
    service: 'openai',
    temp: 0.5,
    oaiModel: OPENAI_MODELS.Turbo,
    streamResponse: false,
    maxTokens: 300,
    maxContextLength: 4095,
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    ultimeJailbreak: 'Keep OOC out of your reply.',
    gaslight: `Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Write at least 1 paragraph, up to 4. Always stay in character and avoid repetition.
Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk
{{example_dialogue}}`,
  },
  openaiTurbo: {
    name: 'OpenAI - DaVinci',
    service: 'openai',
    temp: 0.5,
    oaiModel: OPENAI_MODELS.DaVinci,
    streamResponse: false,
    maxTokens: 300,
    maxContextLength: 4095,
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    gaslight: `Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)

Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk
{{example_dialogue}}`,
  },
  scale: {
    name: 'Scale',
    service: 'scale',
    maxTokens: 300,
    maxContextLength: 7600,
    // Not providing a default gaslight intentionally as most users have thier gaslight configured within Scale.
    gaslight: ``,
  },
  claude: {
    name: 'Claude V1',
    service: 'claude',
    temp: 1,
    claudeModel: CLAUDE_MODELS.ClaudeV1,
    streamResponse: false,
    maxTokens: 500,
    maxContextLength: 7600,
    gaslight: `Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged).

Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk
{{example_dialogue}}`,
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>

export const defaultPresets = {
  ...builtinPresets,
  goose: { ...builtinPresets.basic, service: 'goose' },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
