import { registerAdapter } from './register'
import { ModelAdapter } from './type'

const baseUrl = 'https://api.goose.ai/v1'

export const handleGooseAI: ModelAdapter = async function* (opts) {
  const config = opts.user.adapterConfig?.goose
  if (!config) {
    yield { error: `GooseAI request failed: No config` }
  }
}

const engines = [
  { value: 'gpt-neo-20b', label: 'GPT Neo 20B' },
  { value: 'gpt-j-6b', label: 'GPT-J 6B' },
  { value: 'gpt-neo-2-7b', label: 'GPT-Neo 2.7B' },
  { value: 'gpt-neo-1-3b', label: 'GPT-Neo 1.3B' },
  { value: 'gpt-neo-125m', label: 'GPT-Neo 125M' },
  { value: 'fairseq-13b', label: 'Fairseq 13B' },
  { value: 'fairseq-6-7b', label: 'Fairseq 6.7B' },
  { value: 'fairseq-2-7b', label: 'Fairseq 2.7B' },
  { value: 'fairseq-1-3b', label: 'Fairseq 1.3B' },
  { value: 'fairseq-125m', label: 'Fairseq 125M' },
]

registerAdapter('goose', handleGooseAI, {
  label: 'Goose AI',
  settings: [
    {
      field: 'apiKey',
      label: 'API Key',
      secret: true,
      setting: { type: 'text', placeholder: 'E.g. sk-tJoOs94T...' },
    },
    {
      field: 'engine',
      label: 'Engine',
      helperText: 'GooseAI Engine (Model)',
      secret: false,
      setting: { type: 'list', options: engines },
    },
  ],
  options: [
    'presencePenalty',
    'repetitionPenalty',
    'topA',
    'typicalP',
    'topK',
    'tailFreeSampling',
    'repetitionPenaltySlope',
    'repetitionPenaltyRange',
    'topP',
  ],
})
