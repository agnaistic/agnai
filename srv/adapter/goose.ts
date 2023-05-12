import needle from 'needle'
import { decryptText } from '../db/util'
import { registerAdapter } from './register'
import { ModelAdapter } from './type'
import { sanitise, trimResponseV2 } from '../api/chat/common'

const baseUrl = 'https://api.goose.ai/v1'

export const handleGooseAI: ModelAdapter = async function* (opts) {
  const { log } = opts
  const config = opts.user.adapterConfig?.goose
  if (!config) {
    yield { error: `GooseAI request failed: No config` }
    return
  }

  const key = config.apiKey ? decryptText(config.apiKey) : null
  if (!key) {
    yield { error: `GooseAI request failed: No API key set` }
    return
  }

  const body = {
    prompt: opts.prompt,
    n: 1,
    max_tokens: opts.gen.maxTokens,
    temperature: opts.gen.temp,
    top_p: opts.gen.topP,
    top_k: opts.gen.topK,
    top_a: opts.gen.topA,
    typical_p: opts.gen.typicalP,
    presence_penalty: opts.gen.presencePenalty,
    frequency_penalty: opts.gen.frequencyPenalty,
    repetition_penality: opts.gen.repetitionPenalty,
    repetition_penalty_slope: opts.gen.repetitionPenaltySlope,
    repetition_penalty_range: opts.gen.repetitionPenaltyRange,
  }

  const url = `${baseUrl}/engines/${config.engine}/completions`
  const resp = await needle('post', url, JSON.stringify(body), {
    json: true,
    headers: { Authorization: `Bearer ${key}` },
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    log.error({ error: resp.error }, 'GooseAI failed to send')
    yield { error: `GooseAI request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    log.error({ body: resp.body }, `GooseAI request failed (${resp.statusCode})`)
    const msg =
      resp.body?.error?.message || resp.body.message || resp.statusMessage || 'Unknown error'

    yield {
      error: `GooseAI request failed (${resp.statusCode}): ${msg}`,
    }
    return
  }

  try {
    let text = resp.body.choices[0].text
    if (!text) {
      log.error({ body: resp.body }, 'GooseAI request failed: Empty response')
      yield { error: `GooseAI request failed: Received empty response. Try again.` }
      return
    }
    const parsed = sanitise(text.replace(opts.prompt, ''))
    const trimmed = trimResponseV2(parsed, opts.char, opts.members, ['END_OF_DIALOG'])
    yield trimmed || parsed
  } catch (ex: any) {
    log.error({ err: ex }, 'GooseAI failed to parse')
    yield { error: `GooseAI request failed: ${ex.message}` }
    return
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
