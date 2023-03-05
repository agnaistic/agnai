import needle from 'needle'
import { logger } from '../../logger'
import { joinParts, trimResponse } from '../chat/common'
import { getGenSettings } from './presets'
import { ModelAdapter } from './type'

const MAX_NEW_TOKENS = 196

const base = {
  use_story: false,
  use_memory: false,
  use_authors_note: false,
  use_world_info: false,
  max_context_length: 1400, // Tuneable by user?
  sampler_order: [6, 0, 1, 2, 3, 4, 5],

  // Generation settings -- Can be overriden by the user
  top_a: 0.0,
  /**
   * We deliberately use a low 'max length' to aid with streaming and the lack of support of 'stop tokens' in Kobold.
   */
  // max_length: config.kobold.maxLength || 32,
  // temperature: 0.65,
  // top_p: 0.9,
  // top_k: 0,
  // typical: 1,
  // rep_pen: 1.08,
  // rep_pen_slope: 0.9,
  // rep_pen_range: 1024,
  // tfs: 0.9,
}

export const handleLuminAI: ModelAdapter = async function* ({ char, members, user, prompt }) {
  const body = { koboldUrl: user.koboldUrl, ...base, ...getGenSettings('basic', 'kobold'), prompt }

  let attempts = 0
  let maxAttempts = body.max_length / MAX_NEW_TOKENS + 4

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
