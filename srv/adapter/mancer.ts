import needle from 'needle'
import { ModelAdapter } from './type'
import { decryptText } from '../db/util'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { registerAdapter } from './register'

const mancerModels = {
  'OpenAssistant ORCA': 'https://neuro.mancer.tech/webui/oa-orca/api',
  'Wizard Vicuna': 'https://neuro.mancer.tech/webui/wizvic/api',
}

const modelOptions = Object.entries(mancerModels).map(([label, value]) => ({ label, value }))

export const handleMancer: ModelAdapter = async function* (opts) {
  const body = {
    prompt: opts.prompt,
    add_bos_token: opts.gen.addBosToken ?? false,
    ban_eos_token: opts.gen.banEosToken ?? false,
    do_sample: true,
    max_new_tokens: opts.gen.maxTokens,
    temperature: opts.gen.temp,
    top_a: opts.gen.topA,
    top_k: opts.gen.topK,
    top_p: opts.gen.topP,
    length_penalty: 1,
    truncation_length: opts.gen.maxContextLength,
    typical_p: opts.gen.typicalP,
    encoder_repetition_penalty: opts.gen.encoderRepitionPenalty,
    repetition_penalty: opts.gen.repetitionPenalty,
    repetition_penalty_range: opts.gen.repetitionPenaltyRange,
    skip_special_tokens: true,
    tfs: opts.gen.tailFreeSampling,
    penalty_alpha: opts.gen.penaltyAlpha,
    num_beams: 1,
    seed: -1,
  }

  const url = opts.user.adapterConfig?.mancer?.altUrl || opts.user.adapterConfig?.mancer?.url
  if (!url) {
    yield { error: `Mancer request failed: Model/URL not set` }
    return
  }

  const key = opts.user.adapterConfig?.mancer?.apiKey
  if (!key) {
    yield { error: `Mancer request failed: API key not set` }
    return
  }

  opts.log.debug({ ...body, prompt: null }, 'Mancer payload')
  opts.log.debug(`Prompt:\n${body.prompt}`)
  yield { prompt: body.prompt }

  const resp = await needle('post', `${url}/v1/generate`, body, {
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': opts.guest ? key : decryptText(key),
    },
  }).catch((error) => ({ error }))

  if ('error' in resp) {
    opts.log.error({ err: resp.error })
    yield { error: `Mancer request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    opts.log.error({ err: resp.body }, `Mancer request failed {${resp.statusCode}}`)
    yield {
      error: `Mancer request failed (${resp.statusCode}) ${
        resp.body.error || resp.body.message || resp.statusMessage
      }`,
    }
    return
  }

  try {
    const text = resp.body.results?.[0]?.text
    if (!text) {
      yield {
        error: `Mancer request failed: Received empty response. Try again.`,
      }
      return
    }
    yield { meta: { 'credits-spent': resp.body['x-spent-credits'] } }
    const parsed = sanitise(text.replace(opts.prompt, ''))
    const trimmed = trimResponseV2(parsed, opts.replyAs, opts.members, opts.characters, [
      'END_OF_DIALOG',
    ])
    yield trimmed || parsed
  } catch (ex: any) {
    yield { error: `Mancer request failed: ${ex.message}` }
    return
  }
}

registerAdapter('mancer', handleMancer, {
  label: 'Mancer',
  settings: [
    {
      field: 'url',
      label: 'Model',
      secret: false,
      setting: { type: 'list', options: modelOptions },
      preset: true,
    },
    {
      field: 'urlOverride',
      label: 'URL Override (See: https://mancer.tech/models.html)',
      helperText:
        '(Optional) Overrides the URL from the model selected above - Leave empty if unsure.',
      secret: false,
      setting: { type: 'text', placeholder: 'https://neuro.mancer.tech/webui/...../api' },
      preset: true,
    },
    {
      field: 'apiKey',
      label: 'API Key',
      secret: true,
      setting: { type: 'text', placeholder: 'E.g. mcr-ahjk7dD2...' },
    },
  ],
  options: [
    'temp',
    'addBosToken',
    'banEosToken',
    'repetitionPenalty',
    'repetitionPenaltyRange',
    'encoderRepitionPenalty',
    'frequencyPenalty',
    'gaslight',
    'topA',
    'topP',
    'topK',
    'typicalP',
    'penaltyAlpha',
  ],
})
