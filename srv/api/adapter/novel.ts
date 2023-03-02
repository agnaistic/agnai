import needle from 'needle'
import { v4 } from 'uuid'
import { logger } from '../../logger'
import { sanitise, trimResponse } from '../chat/common'
import { badWordIds } from './novel-bad-words'
import { getGenSettings } from './presets'
import { ModelAdapter } from './type'

const novelUrl = `https://api.novelai.net/ai/generate`

const statuses: Record<number, string> = {
  400: 'Invalid payload',
  401: 'Invalid API key',
  402: 'You need an active subscription',
}

const base = {
  generate_until_sentence: true,
  min_length: 8,
  prefix: 'vanilla',
  // order: [0, 1, 2, 3, 5],
  stop_sequences: [[27]],
  use_cache: false,
  use_string: true,
  repetition_penalty_frequency: 0,
  repetition_penalty_presence: 0,
  bad_word_ids: badWordIds,
  // do_sample: true,
  // logit_bias_exp: [
  //   {
  //     sequence: [1333],
  //     bias: -0.1,
  //     ensure_sequence_finish: false,
  //     generate_once: false,
  //   },
  //   {
  //     sequence: [2296],
  //     bias: -0.1,
  //     ensure_sequence_finish: false,
  //     generate_once: false,
  //   },
  //   {
  //     sequence: [3],
  //     bias: -2,
  //     ensure_sequence_finish: false,
  //     generate_once: false,
  //   },
  //   {
  //     sequence: [187],
  //     bias: 2,
  //     ensure_sequence_finish: false,
  //     generate_once: true,
  //   },
  // ],
  // top_a: 0.0,

  // max_length: config.kobold.maxLength,
  // repetition_penalty: 1.08,
  // repetition_penalty_slope: 3.33,
  // repetition_penalty_range: 2048,
  // tail_free_sampling: 0.879,
  // temperature: 0.63,
  // top_k: 0,
  // top_p: 0.9,
}

export const handleNovel: ModelAdapter = async function* ({ char, members, user, prompt }) {
  if (!user.novelApiKey) {
    yield { error: 'Novel API key not set' }
    return
  }

  const settings = getGenSettings('novel_20BC', 'novel')
  const body = {
    model: user.novelModel,
    input: prompt,
    parameters: { ...base, ...settings },
  }

  const endTokens = ['***', 'Scenario:', '----']

  const response = await needle('post', novelUrl + `?${v4()}`, body, {
    json: true,
    // timeout: 2000,
    response_timeout: 15000,
    headers: { Authorization: `Bearer ${user.novelApiKey}` },
  }).catch((err) => ({ err }))

  if ('err' in response) {
    yield { error: response.err.message }
    return
  }

  const status = response.statusCode || 0
  logger.warn({ output: response.body }, 'Novel response')
  if (statuses[status]) {
    yield { error: statuses[status] }
    return
  }

  if (status >= 400) {
    logger.error({})
    yield { error: response.statusMessage! }
    return
  }

  const parsed = sanitise(response.body.output)
  const trimmed = trimResponse(parsed, char, members, endTokens)
  yield trimmed ? trimmed.response : parsed
}
