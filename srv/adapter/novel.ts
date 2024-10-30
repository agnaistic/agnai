import needle from 'needle'
import { decryptText } from '../db/util'
import { sanitise, sanitiseAndTrim, trimResponseV2 } from '/common/requests/util'
import { badWordIds, clioBadWordsId, penaltyWhitelist } from './novel-bad-words'
import { ModelAdapter } from './type'
import { AppSchema } from '../../common/types/schema'
import { NOVEL_ALIASES, NOVEL_MODELS } from '/common/adapters'
import { requestStream } from './stream'
import { AppLog } from '../middleware'
import { getEncoder } from '../tokenize'
import { toSamplerOrder } from '/common/sampler-order'
import { getStoppingStrings } from './prompt'

export const NOVEL_BASEURL = `https://api.novelai.net`
const NOVEL_TEXT_URL = `https://text.novelai.net` // use text.novelai.net when the new API allows >150 response tokens.

const novelUrl = (model: string) => `${getBaseUrl(model)}/ai/generate`
const streamUrl = (model: string) => `${getBaseUrl(model)}/ai/generate-stream`

/**
 * Samplers:
 * 0. Temperature
 * 1. Top K
 * 2. Nucleus Sampling (Top P)
 * 3. Tail Free Sampling
 * 4. Top A Sampling
 * 5. Typical Sampling
 * 6. CFG Scale
 * 7. Top G (omitted)
 * 8. Mirostat
 */

const statuses: Record<number, string> = {
  400: 'Invalid payload',
  401: 'Invalid API key',
  402: 'You need an active subscription',
  409: "You have a model selected that your subscription tier isn't eligible for",
}

const base = {
  generate_until_sentence: true,
  min_length: 1,
  prefix: 'vanilla',
  use_cache: false,
  use_string: true,
  repetition_penalty_frequency: 0,
  repetition_penalty_presence: 0,
  bad_words_ids: badWordIds,
}

const NEW_PARAMS: Record<string, boolean> = {
  'llama-3-erato-v1': true,
  [NOVEL_MODELS.clio_v1]: true,
  [NOVEL_MODELS.kayra_v1]: true,
}

export const handleNovel: ModelAdapter = async function* (opts) {
  const { members, user, prompt, mappedSettings, guest, log } = opts
  if (!user.novelApiKey) {
    yield { error: 'Novel API key not set' }
    return
  }

  const samplers = toSamplerOrder('novel', opts.gen.order, opts.gen.disabledSamplers)
  if (samplers) {
    opts.gen.order = samplers.order
    opts.gen.disabledSamplers = samplers.disabled
  }

  const model =
    NOVEL_ALIASES[opts.gen.novelModel!] ||
    opts.gen.novelModel ||
    user.novelModel ||
    NOVEL_MODELS.clio_v1

  const processedPrompt = processNovelAIPrompt(prompt)

  const body = {
    model,
    input: processedPrompt,
    parameters: NEW_PARAMS[model] ? getModernParams(opts.gen) : { ...base, ...mappedSettings },
  }

  const baseStops = getStoppingStrings(opts)

  if (opts.kind === 'plain') {
    body.parameters.prefix = 'special_instruct'
    body.parameters.phrase_rep_pen = 'aggressive'
  } else {
    const { encode } = getEncoder('novel', model)
    const stops: Array<number[]> = []
    const biases: any[] = []

    for (const { bias, seq } of opts.gen.phraseBias || []) {
      biases.push({
        // Range from -2 to 2
        bias: Math.min(Math.max(bias, -2), 2),
        sequence: encode(seq),
        generate_once: true,
        ensure_sequence_finish: false,
      })
    }

    body.parameters.logit_bias_exp = biases
    const all = ['***', 'Scenario:', '----', '⁂'].concat(baseStops).map(encode)

    for (const stop of all) {
      stops.push(stop)
    }

    body.parameters.stop_sequences = stops
  }

  yield { prompt: body.input }

  const endTokens = baseStops.concat(['***', 'Scenario:', '----', '⁂'])

  log.debug(
    {
      ...body,
      input: null,
      parameters: {
        ...body.parameters,
        bad_words_ids: null,
        repetition_penalty_whitelist: null,
        stop_sequences: null,
      },
    },
    'NovelAI payload'
  )
  log.debug(`Prompt:\n${body.input}`)

  const headers = {
    Authorization: `Bearer ${guest ? user.novelApiKey : decryptText(user.novelApiKey)}`,
  }

  const maxTokens = await getMaxTokens(body.model, headers)
  if (maxTokens) {
    body.parameters.max_length = Math.min(body.parameters.max_length, maxTokens)
  }

  const stream =
    opts.kind !== 'summary' && opts.gen.streamResponse
      ? streamCompletion(headers, body, log)
      : fullCompletion(headers, body, log)

  let accum = ''
  while (true) {
    const generated = await stream.next()

    if (!generated || !generated.value) break

    if ('error' in generated.value) {
      yield { error: generated.value.error }
      return
    }

    if ('token' in generated.value) {
      accum += generated.value.token
      yield { partial: sanitiseAndTrim(accum, prompt, opts.replyAs, opts.characters, members) }
    }

    if ('tokens' in generated.value) {
      accum = generated.value.tokens
      break
    }
  }

  const parsed = sanitise(accum)
  const trimmed = trimResponseV2(parsed, opts.replyAs, members, opts.characters, endTokens)

  yield trimmed || parsed
}

function getModernParams(gen: Partial<AppSchema.GenSettings>) {
  const module = gen.temporary?.module || 'vanilla'

  const max_length = Math.min(gen.maxTokens!, 150)
  const payload: any = {
    temperature: gen.temp,
    max_length,
    min_length: 10,
    top_k: gen.topK,
    top_p: gen.topP,
    top_a: gen.topA,
    min_p: gen.minP ?? 0,
    typical_p: gen.typicalP,
    tail_free_sampling: gen.tailFreeSampling,
    repetition_penalty: gen.repetitionPenalty,
    repetition_penalty_range: gen.repetitionPenaltyRange,
    repetition_penalty_slope: gen.repetitionPenaltySlope,
    repetition_penalty_frequency: gen.frequencyPenalty,
    repetition_penalty_presence: gen.presencePenalty,
    generate_until_sentence: true,
    use_cache: false,
    use_string: true,
    return_full_text: false,
    prefix: module,
    phrase_rep_pen: gen.phraseRepPenalty || 'aggressive',
    order: gen.order,
    bad_words_ids: clioBadWordsId,
    repetition_penalty_whitelist: penaltyWhitelist,
    mirostat_tau: gen.mirostatTau,
    mirostat_lr: gen.mirostatLR,
  }

  return payload
}

const streamCompletion = async function* (headers: any, body: any, _log: AppLog) {
  const resp = needle.post(streamUrl(body.model), body, {
    parse: false,
    json: true,
    headers: {
      ...headers,
      Accept: `text/event-stream`,
    },
  })

  const tokens = []

  try {
    const events = requestStream(resp)
    for await (const event of events) {
      if (event.error) {
        yield { error: `NovelAI streaming request failed: ${event.error}` }
        return
      }

      if (event.type !== 'newToken') {
        continue
      }

      const data = JSON.parse(event.data) as {
        token: string
        final: boolean
        ptr: number
        error?: string
      }

      if (data.error) {
        yield { error: `NovelAI streaming request failed: ${data.error}` }
        return
      }
      tokens.push(data.token)
      yield { token: data.token }
    }
  } catch (err: any) {
    yield { error: `NovelAI streaming request failed: ${err.message || err}` }
    return
  }

  return { text: tokens.join('') }
}

async function* fullCompletion(headers: any, body: any, log: AppLog) {
  const res = await needle('post', novelUrl(body.model), body, {
    json: true,
    // timeout: 2000,
    response_timeout: 30000,
    headers,
  }).catch((err) => ({ err }))

  if ('err' in res) {
    log.error({ err: `Novel request failed: ${res.err?.message || res.err}` })
    yield { error: res.err.message }
    return
  }

  const status = res.statusCode || 0
  if (statuses[status]) {
    log.error({ error: res.body }, `Novel response failed (${status})`)
    yield { error: `Novel API returned an error (${statuses[status]}) ${res.body.message}` }
    return
  }

  if (status >= 400) {
    log.error({ error: res.body }, `Novel request failed (${status})`)
    yield {
      error: `Novel API returned an error (${res.statusMessage!}) ${res.body.message}`,
    }
    return
  }

  if (res.body.error) {
    log.error({ error: res.body }, `Novel response failed (${status})`)
    yield {
      error: `Novel API returned an error: ${
        res.body.error.message || res.body.error || res.body.message
      }`,
    }
    return
  }

  return { tokens: res.body.output }
}

function processNovelAIPrompt(prompt: string) {
  return prompt.replace(/^\<START\>$/gm, '***').replace(/\n\n+/gi, '\n\n')
}

function getBaseUrl(model: string) {
  if (model === NOVEL_MODELS.kayra_v1 || model === 'llama-3-erato-v1') {
    return NOVEL_TEXT_URL
  }

  if (!model.includes('/')) return NOVEL_BASEURL
  const url = model.split('/').slice(0, -1).join('/')
  if (url.toLowerCase().startsWith('http')) return url
  return `https://${url}`
}

async function getMaxTokens(model: string, headers: any) {
  try {
    const config = await needle(
      'get',
      'https://api.novelai.net/user/subscription',
      {},
      { json: true, headers, response_timeout: 5000 }
    )

    if (model !== 'llama-3-erato-v1' && model !== NOVEL_MODELS.kayra_v1) {
      return
    }

    const tier = config.body?.tier ?? 0
    if (tier !== 3) return 150
    return 250
  } catch (ex) {
    return
  }
}
