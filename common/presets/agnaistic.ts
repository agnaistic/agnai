import { OPENAI_MODELS } from '../adapters'
import { AppSchema } from '../types'
import { neat } from '../util'

const gaslight = neat`
Below is an instruction that describes a task. Write a response that appropriately completes the request.

Write {{char}}'s next reply in a fictional roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}}.

{{char}}'s Persona: {{personality}}

This scenario of the conversation: {{scenario}}

This is how {{char}} should talk: {{example_dialogue}}

Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.

{{#each msg}}{{#if .isbot}}## Response:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}## Instruction:\n{{.name}}: {{.msg}}{{/if}}
{{/each}}
{{ujb}}
## Response:
{{post}}
`

export const agnaiPresets = {
  agnai: {
    service: 'agnaistic',
    name: 'Agnaistic',
    maxTokens: 250,
    maxContextLength: 4090,
    repetitionPenalty: 1.1,
    repetitionPenaltySlope: 0,
    repetitionPenaltyRange: 128,
    temp: 0.85,
    topK: 0,
    topP: 1,
    typicalP: 1,
    topA: 1,
    tailFreeSampling: 0.95,
    encoderRepitionPenalty: 1.0,
    penaltyAlpha: 0,
    addBosToken: true,
    banEosToken: false,
    skipSpecialTokens: true,
    frequencyPenalty: 0,
    presencePenalty: 0,
    gaslight: gaslight,
    ultimeJailbreak: '',
    oaiModel: OPENAI_MODELS.Turbo,
    streamResponse: true,
    memoryDepth: 50,
    memoryContextLimit: 500,
    memoryReverseWeight: false,
    useGaslight: true,
    antiBond: false,
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
