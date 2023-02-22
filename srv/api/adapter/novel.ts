import needle from 'needle'
import { store } from '../../db'
import { logger } from '../../logger'
import { createPrompt } from './prompt'
import { ModelAdapter } from './type'

const novelUrl = `https://api.novelai.net/ai/generate`

const statuses: Record<number, string> = {
  400: 'Invalid payload',
  401: 'Invalid API key',
  402: 'You need an active subscription',
}

const base = {
  model: 'euterpe-v2',
  max_length: 100,
  min_length: 8,
  order: [2, 1, 3, 0],
  prefix: 'vanilla',
  repetition_penalty: 1.148125,
  repetition_penalty_frequency: 0,
  repetition_penalty_presence: 0,
  repetition_penalty_sloe: 0.09,
  stop_sequences: [[25]],
  tail_free_sampling: 0.975,
  temperature: 0.63,
  top_k: 0,
  top_p: 0.975,
  use_cache: false,
  use_string: true,
}

export const handleNovel: ModelAdapter = async function* ({ chat, char, history, message }) {
  const settings = await store.settings.get()
  if (!settings.novelApiKey) {
    yield { error: 'Novel API key not set' }
    return
  }

  const body = {
    ...base,
    input: createPrompt({ chat, char, history, message }),
  }

  const response = await needle('post', novelUrl, body, {
    json: true,
    headers: { Authorization: `Bearer ${settings.novelApiKey}` },
  })

  logger.warn(response.body, 'Novel response')
  const status = response.statusCode || 0
  if (statuses[status]) {
    yield { error: statuses[status] }
    return
  }

  yield response.body.output

  if (status >= 400) {
    yield { error: response.statusMessage! }
    return
  }
}
