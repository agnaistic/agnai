import needle from 'needle'
import { logger } from '../logger'
import { getEndTokens, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter } from './type'
import { defaultPresets } from '../../common/presets'
import { AppSchema } from '../db/schema'
import { StatusError } from '../api/wrap'
import { config } from '../config'

export type LuminAIMemoryEntry = {
  memory_book_id: string
  memory_id: number
  source: string
  entry: string
  priority: number
  weight: number
  enabled: boolean
  dist: number
}

export const FILAMENT_ENABLED = config.adapters.includes('luminai')

const REQUIRED_SAMPLERS = defaultPresets.basic.order

const base = {
  use_story: false,
  use_memory: false,
  use_authors_note: false,
  use_world_info: false,
}

export const handleLuminAI: ModelAdapter = async function* ({
  char,
  members,
  user,
  prompt,
  settings,
  log,
}) {
  const stopTokens = getEndTokens(char, members, ['END_OF_DIALOG'])
  const body = { koboldUrl: user.koboldUrl, stopTokens, ...base, ...settings, prompt }

  // Kobold sampler order parameter must contain all 6 samplers to be valid
  // If the sampler order is provided, but incomplete, add the remaining samplers.
  if (body.sampler_order && body.sampler_order.length !== 6) {
    for (const sampler of REQUIRED_SAMPLERS) {
      if (body.sampler_order.includes(sampler)) continue

      body.sampler_order.push(sampler)
    }
  }

  log.debug(body, 'LuminAI payload')

  const resp = await needle('post', `${user.luminaiUrl}/api/v1/generate`, body, {
    json: true,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    log.error({ err: resp.error }, `Filamant request failed`)
    yield { error: `Filament request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    log.error({ err: resp.body }, `Filament request failed`)
    yield { error: `Filament request failed: ${resp.statusMessage}` }
    return
  }

  const text = resp.body.results?.[0]?.text as string
  if (text) {
    const trimmed = trimResponseV2(text, char, members, stopTokens)
    yield trimmed || text
    return
  } else {
    logger.error({ err: resp.body }, 'Failed to generate text using Kobold adapter')
    yield { error: resp.body }
    return
  }
}

export const filament = {
  embedMemory,
  retrieveMemories,
}

export async function embedMemory(user: AppSchema.User, book: AppSchema.MemoryBook) {
  if (!user.luminaiUrl) {
    throw new Error(`LuminAI URL not set`)
  }

  const url = `${user.luminaiUrl}/api/memory/${book._id}/embed`
  const res = await needle('post', url, { memory_book: book }, { json: true })

  if (res.statusCode && res.statusCode >= 400) {
    logger.error({ err: res.body }, `Filament memory embedding failed`)
  }
}

export async function retrieveMemories(user: AppSchema.User, bookId: string, lines: string[]) {
  if (!user.luminaiUrl) {
    throw new Error(`LuminAI URL not set`)
  }

  const url = `${user.luminaiUrl}/api/memory/${bookId}/prompt`
  const res = await needle(
    'post',
    url,
    { prompt: lines, num_memories_per_sentence: 3 },
    { json: true }
  ).catch((error) => ({ error }))
  if ('error' in res) {
    logger.error({ err: res.error }, `Filament request failed`)
    throw res.error
  }

  if (res.statusCode && res.statusCode >= 400) {
    logger.error({ err: res.body }, `Filament memory retrieval failed`)
    throw new StatusError(
      `Failed to retrieve memories (${res.statusCode}): ${res.body.message || res.statusMessage}`,
      res.statusCode
    )
  }

  const result = res.body as LuminAIMemoryEntry[]
  return result
}
