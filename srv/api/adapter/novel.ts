import needle from 'needle'
import { v4 } from 'uuid'
import { decryptText } from '../../db/util'
import { logger } from '../../logger'
import { sanitise, trimResponse } from '../chat/common'
import { badWordIds } from './novel-bad-words'
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
  stop_sequences: [[27]],
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

  const response = await needle('post', novelUrl + `?${v4()}`, body, {
    json: true,
    // timeout: 2000,
    response_timeout: 15000,
    headers: { Authorization: `Bearer ${decryptText(user.novelApiKey)}` },
  }).catch((err) => ({ err }))

  if ('err' in response) {
    yield { error: response.err.message }
    return
  }

  const status = response.statusCode || 0
  if (statuses[status]) {
    yield { error: statuses[status] }
    return
  }

  if (status >= 400) {
    yield { error: response.statusMessage! }
    return
  }

  const parsed = sanitise(response.body.output)
  const trimmed = trimResponse(parsed, char, members, endTokens)
  yield trimmed ? trimmed.response : parsed
}
