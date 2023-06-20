import needle from 'needle'
import { defaultPresets } from '../../common/presets'
import { logger } from '../logger'
import { normalizeUrl, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter } from './type'

const REQUIRED_SAMPLERS = defaultPresets.basic.order

const base = {
  use_story: false,
  use_memory: false,
  use_authors_note: false,
  use_world_info: false,
}

export const handleKobold: ModelAdapter = async function* ({
  char,
  members,
  characters,
  user,
  prompt,
  settings,
  log,
  ...opts
}) {
  const body = { ...base, ...settings, prompt }

  // Kobold has a stop requence parameter which automatically
  // halts generation when a certain token is generated
  const stop_sequence = ['END_OF_DIALOG', 'You:']

  for (const [id, char] of Object.entries(characters || {})) {
    if (!char) continue
    if (id === opts.replyAs._id) continue
    stop_sequence.push(char.name + ':')
  }

  for (const member of members) {
    if (!member.handle) continue
    if (member.handle === opts.replyAs.name) continue
    stop_sequence.push(member.handle + ':')
  }

  body.stop_sequence = stop_sequence

  // Kobold sampler order parameter must contain all 6 samplers to be valid
  // If the sampler order is provided, but incomplete, add the remaining samplers.
  if (body.sampler_order && body.sampler_order.length !== 6) {
    for (const sampler of REQUIRED_SAMPLERS) {
      if (body.sampler_order.includes(sampler)) continue

      body.sampler_order.push(sampler)
    }
  }

  log.debug(body, 'Kobold payload')

  const resp = await needle('post', `${normalizeUrl(user.koboldUrl)}/api/v1/generate`, body, {
    headers: { 'Bypass-Tunnel-Reminder': 'true' },
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
    const trimmed = trimResponseV2(text, opts.replyAs, members, characters, [
      'END_OF_DIALOG',
      'You:',
    ])
    yield trimmed || text
  } else {
    logger.error({ err: resp.body }, 'Failed to generate text using Kobold adapter')
    yield { error: `Kobold failed to generate a response: ${resp.body}` }
    return
  }
}
