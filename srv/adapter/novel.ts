import needle from 'needle'
import { decryptText } from '../db/util'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { badWordIds } from './novel-bad-words'
import { ModelAdapter } from './type'

export const NOVEL_BASEURL = `https://api.novelai.net`
const novelUrl = `${NOVEL_BASEURL}/ai/generate`

const statuses: Record<number, string> = {
  400: 'Invalid payload',
  401: 'Invalid API key',
  402: 'You need an active subscription',
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

  const body = {
    model: user.novelModel,
    input: prompt,
    parameters: { ...base, ...settings },
  }

  const endTokens = ['***', 'Scenario:', '----']

  log.debug({ ...body, parameters: { ...body.parameters, bad_word_ids: null } }, 'NovelAI payload')

  const response = await needle('post', novelUrl, body, {
    json: true,
    // timeout: 2000,
    response_timeout: 15000,
    headers: {
      Authorization: `Bearer ${guest ? user.novelApiKey : decryptText(user.novelApiKey)}`,
    },
  }).catch((err) => ({ err }))

  if ('err' in response) {
    log.error({ err: `Novel request failed: ${response.err?.message || response.err}` })
    yield { error: response.err.message }
    return
  }

  const status = response.statusCode || 0
  if (statuses[status]) {
    log.error({ error: response.body }, `Novel response failed (${status})`)
    yield { error: `Novel API returned an error: ${statuses[status]}` }
    return
  }

  if (status >= 400) {
    log.error({ error: response.body }, `Novel request failed (${status})`)
    yield { error: `Novel API returned an error: ${response.statusMessage!}` }
    return
  }

  if (response.body.error) {
    log.error({ error: response.body }, `Novel response failed (${status})`)
    yield { error: `Novel API returned an error: ${response.body.error}` }
    return
  }

  const parsed = sanitise(response.body.output)
  const trimmed = trimResponseV2(parsed, char, members, endTokens)
  yield trimmed || parsed
}
