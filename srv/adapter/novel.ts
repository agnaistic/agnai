import needle from 'needle'
import { decryptText } from '../db/util'
import { sanitise, sanitiseAndTrim, trimResponseV2 } from '../api/chat/common'
import { badWordIds, clioBadWordsId } from './novel-bad-words'
import { ModelAdapter } from './type'
import { AppSchema } from '../../common/schema'
import { NOVEL_MODELS } from '/common/adapters'
import { needleToSSE } from './stream'
import { AppLog } from '../logger'

export const NOVEL_BASEURL = `https://api.novelai.net`
const novelUrl = `${NOVEL_BASEURL}/ai/generate`
const streamUrl = `${NOVEL_BASEURL}/ai/generate-stream`

/**
 * Samplers:
 * 0. Temperature
 * 1. Top K
 * 2. Nucleus Sampling
 * 3. Tail Free Sampling
 * 4. Top A Sampling
 * 5. Typical Sampling
 */

const statuses: Record<number, string> = {
  400: 'Invalid payload',
  401: 'Invalid API key',
  402: 'You need an active subscription',
  409: "You have a model selected that your subscription tier isn't eligible for",
}

const base = {
  generate_until_sentence: true,
  min_length: 8,
  prefix: 'vanilla',
  stop_sequences: [[27]], // Stop on ':'
  use_cache: false,
  use_string: true,
  repetition_penalty_frequency: 0,
  repetition_penalty_presence: 0,
  bad_words_ids: badWordIds,
}

export const handleNovel: ModelAdapter = async function* ({
  char,
  members,
  user,
  prompt,
  settings,
  guest,
  log,
  ...opts
}) {
  if (!user.novelApiKey) {
    yield { error: 'Novel API key not set' }
    return
  }

  const model = opts.gen.novelModel || user.novelModel || NOVEL_MODELS.euterpe

  const processedPrompt = processNovelAIPrompt(prompt)

  const body = {
    model,
    input: processedPrompt,
    parameters: model === NOVEL_MODELS.clio_v1 ? getClioParams(opts.gen) : { ...base, ...settings },
  }

  const endTokens = ['***', 'Scenario:', '----', '⁂']

  log.debug({ ...body, parameters: { ...body.parameters, bad_words_ids: null } }, 'NovelAI payload')

  const headers = {
    Authorization: `Bearer ${guest ? user.novelApiKey : decryptText(user.novelApiKey)}`,
  }

  const stream =
    opts.kind !== 'summary' && opts.gen.streamResponse
      ? streamCompletition(headers, body, log)
      : fullCompletition(headers, body, log)

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

function getClioParams(gen: Partial<AppSchema.GenSettings>) {
  return {
    temperature: gen.temp,
    max_length: gen.maxTokens,
    min_length: 1,
    top_k: gen.topK,
    top_p: gen.topP,
    top_a: gen.topA,
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
    prefix: 'vanilla',
    order: gen.order,
    bad_words_ids: clioBadWordsId,
  }
}

const streamCompletition = async function* (headers: any, body: any, _log: AppLog) {
  const resp = needle.post(streamUrl, body, {
    parse: false,
    json: true,
    headers: {
      ...headers,
      Accept: `text/event-stream`,
    },
  })

  const tokens = []

  try {
    const events = needleToSSE(resp)

    for await (const event of events) {
      const lines = event.split('\n')

      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const data = JSON.parse(line.slice(5)) as {
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
    }
  } catch (err: any) {
    yield { error: `NovelAI streaming request failed: ${err.message || err}` }
    return
  }

  return { text: tokens.join('') }
}

const fullCompletition = async function* (headers: any, body: any, log: AppLog) {
  const res = await needle('post', novelUrl, body, {
    json: true,
    // timeout: 2000,
    response_timeout: 15000,
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
    yield { error: `Novel API returned an error: ${res.body.error.message || res.body.error}` }
    return
  }

  return { tokens: res.body.output }
}

function processNovelAIPrompt(prompt: string) {
  return prompt.replace(/^\<START\>$/gm, '***')
}
