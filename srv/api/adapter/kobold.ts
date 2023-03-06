import needle from 'needle'
import { logger } from '../../logger'
import { joinParts, trimResponse } from '../chat/common'
import { ModelAdapter } from './type'

const base = {
  use_story: false,
  use_memory: false,
  use_authors_note: false,
  use_world_info: false,
  max_context_length: 1400, // Tuneable by user?
  // sampler_order: [6, 0, 1, 2, 3, 4, 5],

  /**
   * We deliberately use a low 'max length' to aid with streaming and the lack of support of 'stop tokens' in Kobold.
   */
}

export const handleKobold: ModelAdapter = async function* ({
  char,
  members,
  user,
  prompt,
  genSettings,
}) {
  const body = { ...base, ...genSettings, prompt }

  let attempts = 0
  let maxAttempts = 1

  const endTokens = ['END_OF_DIALOG']

  const parts: string[] = []

  while (attempts < maxAttempts) {
    attempts++

    const resp = await needle('post', `${user.koboldUrl}/api/v1/generate`, body, {
      json: true,
    }).catch((err) => ({ error: err }))

    if ('error' in resp) {
      yield { error: `Kobold request failed: ${resp.error?.message || resp.error}` }
      return
    }

    if (resp.statusCode && resp.statusCode >= 400) {
      yield { error: `Kobold request failed: ${resp.statusMessage}` }
      return
    }

    const text = resp.body.results?.[0]?.text as string
    if (text) {
      parts.push(text)
      const combined = joinParts(parts)
      const trimmed = trimResponse(combined, char, members, endTokens)
      if (trimmed) {
        logger.info({ all: parts, ...trimmed }, 'Kobold response')
        yield trimmed.response
        return
      }

      body.prompt = combined
      yield combined
    } else {
      logger.error({ err: resp.body }, 'Failed to generate text using Kobold adapter')
      yield { error: resp.body }
      return
    }
  }
}
