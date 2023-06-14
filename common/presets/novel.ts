import { NOVEL_MODELS } from '../adapters'
import { AppSchema } from '/srv/db/schema'

export const novelPresets = {
  novel_clio: {
    name: 'Clio - Talker C',
    service: 'novel',
    novelModel: NOVEL_MODELS.clio_v1,
    maxTokens: 300,
    maxContextLength: 8000,
    repetitionPenalty: 1.5,
    repetitionPenaltyRange: 8000,
    repetitionPenaltySlope: 0.09,
    frequencyPenalty: 0.03,
    presencePenalty: 0.005,
    temp: 1.05,
    tailFreeSampling: 0.967,
    topK: 80,
    topP: 0.95,
    topA: 0.075,
    order: [1, 3, 4, 0, 2],
    streamResponse: false,
    useGaslight: true,
    gaslight: `{{char}} Memory: {{memory}}
Description of {{char}}: {{personality}}
[ Title: Dialogue between {{char}} and {{user}}; Tags: conversation; Genre: online roleplay ]
***
Summary: {{scenario}}`,
  },
  novel_20BC: {
    name: '20BC+',
    service: 'novel',
    maxTokens: 80,
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
    name: 'Blue Lighter',
    service: 'novel',
    maxTokens: 80,
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
} satisfies Record<string, Partial<AppSchema.GenSettings>>
