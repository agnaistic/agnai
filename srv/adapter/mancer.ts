import needle from 'needle'
import { Completion, Inference, ModelAdapter } from './type'
import { decryptText } from '../db/util'
import { registerAdapter } from './register'
import { getStoppingStrings } from './prompt'
import { sanitise, sanitiseAndTrim, trimResponseV2 } from '/common/requests/util'
import { streamCompletion } from './stream'
import { requestFullCompletion } from './chat-completion'
import { getCompletionContent } from './openai'

const mancerOptions: Record<string, string> = {}

let modelCache: MancerModel[]

export type MancerModel = {
  id: string
  name: string
  perTokenOutput: number
  perTokenPrompt: number
  paidOnly: boolean
  context: number
  online: boolean
  hasDocs: boolean
  streaming: boolean
  description: string
}

const modelOptions = Object.entries(mancerOptions).map(([label, value]) => ({ label, value }))

export const handleMancer: ModelAdapter = async function* (opts) {
  const { gen } = opts
  const url = 'https://neuro.mancer.tech/oai/v1/completions'

  const userModel: string = opts.gen.registered?.mancer?.url || opts.user.adapterConfig?.mancer?.url

  const model = userModel ? modelCache.find((m) => userModel.includes(m.id))?.id : null
  const body: any = {
    prompt: opts.prompt,
    model,
    ignore_eos: !opts.gen.banEosToken,
    max_new_tokens: opts.gen.maxTokens,
    temperature: opts.gen.temp!,
    top_a: opts.gen.topA,
    top_k: opts.gen.topK,
    top_p: opts.gen.topP,
    min_p: gen.minP,
    length_penalty: 1,
    max_tokens: opts.gen.maxContextLength,
    typical_p: opts.gen.typicalP,
    repetition_penalty: opts.gen.repetitionPenalty,
    presence_penalty: opts.gen.presencePenalty,
    frequency_penalty: opts.gen.frequencyPenalty,
    tfs: opts.gen.tailFreeSampling,
    seed: -1,
    stop: getStoppingStrings(opts),
    smoothing_factor: gen.smoothingFactor,
    smoothing_curve: gen.smoothingCurve,
    stream: opts.gen.streamResponse,
  }

  if (gen.dynatemp_range) {
    if (gen.dynatemp_range >= gen.temp!) {
      gen.dynatemp_range = gen.temp! - 0.1
    }

    body.dynatemp_min = (gen.temp ?? 1) - (gen.dynatemp_range ?? 0)
    body.dynatemp_max = (gen.temp ?? 1) + (gen.dynatemp_range ?? 0)
    body.dynatemp_exponent = gen.dynatemp_exponent
    body.dynatemp_mode = 1
  }

  if (!model) {
    yield { error: 'Mancer request failed: Select a model and try again' }
    return
  }

  const key = opts.user.adapterConfig?.mancer?.apiKey
  if (!key) {
    yield { error: `Mancer request failed: API key not set` }
    return
  }

  const apiKey = opts.guest ? key : decryptText(key)
  opts.log.debug({ ...body, prompt: null }, 'Mancer payload')
  opts.log.debug(`Prompt:\n${body.prompt}`)
  yield { prompt: body.prompt }

  const headers = {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey,
  }

  let accumulated = ''
  let response: Completion<Inference> | undefined

  const iter = opts.gen.streamResponse
    ? streamCompletion(opts.user._id, url, headers, body, 'mancer', opts.log, 'openai')
    : requestFullCompletion(opts.user._id, url, headers, body, 'mancer', opts.log)

  while (true) {
    let generated = await iter.next()

    // Both the streaming and non-streaming generators return a full completion and yield errors.
    if (generated.done) {
      response = generated.value
      break
    }

    if (generated.value.error) {
      yield { error: generated.value.error }
      return
    }

    // Only the streaming generator yields individual tokens.
    if ('token' in generated.value) {
      accumulated += generated.value.token
      yield {
        partial: sanitiseAndTrim(
          accumulated,
          opts.prompt,
          opts.char,
          opts.characters,
          opts.members
        ),
      }
    }
  }
  try {
    let text = getCompletionContent(response, opts.log)
    if (text instanceof Error) {
      yield { error: `Mancer returned an error: ${text.message}` }
      return
    }

    if (!text?.length) {
      opts.log.error({ body: response }, 'Mancer request failed: Empty response')
      yield { error: `Mancer request failed: Received empty response. Try again.` }
      return
    }

    accumulated = text

    const parsed = sanitise(accumulated.replace(opts.prompt, ''))
    const trimmed = trimResponseV2(parsed, opts.replyAs, opts.members, opts.characters, body.stop)
    yield trimmed || parsed
  } catch (ex: any) {
    opts.log.error({ err: ex }, 'Mancer failed to parse')
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

export async function getMancerModels() {
  if (modelCache) return modelCache

  try {
    const res = await needle('get', 'https://mancer.tech/internal/api/models', {})
    if (res.body) {
      modelCache = res.body.models

      modelOptions.length = 0
      for (const model of res.body.models as MancerModel[]) {
        modelOptions.push({
          label: `${model.paidOnly ? '(Paid) ' : ''} ${model.name} (${
            model.perTokenOutput
          }cr/out + ${model.perTokenPrompt}/prompt)`,
          value: model.id,
        })
      }
    }

    return modelCache
  } catch (ex) {
    return modelCache || []
  }
}

setInterval(getMancerModels, 60000 * 2)
getMancerModels()
