import needle from 'needle'
import { logger } from '../../logger'
import { trimResponse } from '../chat/common'
import { ModelAdapter } from './type'

const REQUIRED_SAMPLERS = [0, 1, 2, 3, 4, 5]

const base = {
  use_story: false,
  use_memory: false,
  use_authors_note: false,
  use_world_info: false,

  /**
   * We deliberately use a low 'max length' to aid with streaming and the lack of support of 'stop tokens' in Kobold.
   */
}

export const handleKobold: ModelAdapter = async function* ({
  char,
  members,
  user,
  prompt,
  settings,
}) {
  const body = { ...base, ...settings, prompt }

  // Kobold sampler order parameter must contain all 6 samplers to be valid
  // If the sampler order is provided, but incomplete, add the remaining samplers.
  if (body.order && body.order.length !== 6) {
    for (const sampler of REQUIRED_SAMPLERS) {
      if (body.order.includes(sampler)) continue

      body.order.push(sampler)
    }
  }

  const endTokens = ['END_OF_DIALOG']

  const resp = await needle('post', `${user.koboldUrl}/api/v1/generate`, body, {
    json: true,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    yield { error: `Kobold request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    yield { error: `Kobold request failed: ${resp.statusMessage}` }
    logger.error({ error: resp.body }, `Kobold request failed`)
    return
  }

  const text = resp.body.results?.[0]?.text as string
  if (text) {
    const trimmed = trimResponse(text, char, members, endTokens)
    yield trimmed || text
  } else {
    logger.error({ err: resp.body }, 'Failed to generate text using Kobold adapter')
    yield { error: resp.body }
    return
  }
}
