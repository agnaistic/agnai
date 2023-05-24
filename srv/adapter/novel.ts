import needle from 'needle'
import { decryptText } from '../db/util'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { badWordIds, clioBadWordsId } from './novel-bad-words'
import { ModelAdapter } from './type'
import { AppSchema } from '../db/schema'
import { NOVEL_MODELS } from '/common/adapters'
import { defaultPresets } from '/common/default-preset'

export const NOVEL_BASEURL = `https://api.novelai.net`
const novelUrl = `${NOVEL_BASEURL}/ai/generate`

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
}

const newModelPresets = new Set([defaultPresets.novel_clio.name])

const base = {
  generate_until_sentence: true,
  min_length: 8,
  prefix: 'vanilla',
  stop_sequences: [[27]], // Stop on ':'
  use_cache: false,
  use_string: true,
  repetition_penalty_frequency: 0,
  repetition_penalty_presence: 0,
  bad_word_ids: badWordIds,
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

  const model = newModelPresets.has(opts.gen.name || '') ? NOVEL_MODELS.clio_v1 : user.novelModel

  const body = {
    model,
    input: prompt,
    parameters: model === NOVEL_MODELS.clio_v1 ? getClioParams(opts.gen) : { ...base, ...settings },
  }

  const endTokens = ['***', 'Scenario:', '----']

  log.debug({ ...body, parameters: { ...body.parameters, bad_word_ids: null } }, 'NovelAI payload')

  const res = await needle('post', novelUrl, body, {
    json: true,
    // timeout: 2000,
    response_timeout: 15000,
    headers: {
      Authorization: `Bearer ${guest ? user.novelApiKey : decryptText(user.novelApiKey)}`,
    },
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

  const parsed = sanitise(res.body.output)
  const trimmed = trimResponseV2(parsed, opts.replyAs, members, opts.characters, endTokens)
  yield trimmed || parsed
}

function getClioParams(gen: Partial<AppSchema.GenSettings>) {
  return {
    temperature: gen.temp,
    max_length: gen.maxTokens,
    min_length: 8,
    top_k: gen.topK,
    top_p: gen.topP,
    top_a: gen.topA,
    tail_free_sampling: gen.tailFreeSampling,
    repetition_penalty: gen.repetitionPenalty,
    repetition_penalty_range: gen.repetitionPenaltyRange,
    repetition_penalty_frequency: gen.frequencyPenalty,
    repetition_penalty_presence: gen.presencePenalty,
    generate_until_sentence: true,
    use_cache: false,
    use_string: true,
    return_full_text: false,
    prefix: 'vanilla',
    order: gen.order,
    bad_word_ids: clioBadWordsId,
  }
}
