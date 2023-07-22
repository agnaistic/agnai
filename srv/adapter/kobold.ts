import needle from 'needle'
import { defaultPresets } from '../../common/presets'
import { logger } from '../logger'
import { normalizeUrl, sanitise, sanitiseAndTrim, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter } from './type'
import { needleToSSE } from './stream'

/**
 * Sampler order
 * 0. Top K
 * 1. Top A
 * 2. Top P
 * 3. Tail Free Sampling
 * 4. Typical P
 * 5. Temperature
 * 6. Repetition Penalty
 */

const MIN_STREAMING_KCPPVERSION = '1.30'
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
  mappedSettings,
  log,
  ...opts
}) {
  const body = { ...base, ...mappedSettings, prompt }

  const baseURL = `${normalizeUrl(user.koboldUrl)}`

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

  yield { prompt: body.prompt }

  logger.debug({ ...body, prompt: null }, 'Kobold payload')
  logger.debug(`Prompt:\n${body.prompt}`)

  // Only KoboldCPP at version 1.30 and higher has streaming support
  const isStreamSupported = await checkStreamSupported(`${baseURL}/api/extra/version`)

  const stream =
    opts.gen.streamResponse && isStreamSupported
      ? streamCompletition(`${baseURL}/api/extra/generate/stream`, body)
      : fullCompletion(`${baseURL}/api/v1/generate`, body)

  let accum = ''

  while (true) {
    const generated = await stream.next()

    if (!generated || !generated.value) break

    if ('error' in generated.value) {
      yield { error: generated.value.error }
      return
    }

    if ('token' in generated.value) {
      accum += generated.value.token
      yield { partial: sanitiseAndTrim(accum, prompt, opts.replyAs, characters, members) }
    }

    if ('tokens' in generated.value) {
      accum = generated.value.tokens
      break
    }
  }

  const parsed = sanitise(accum)
  const trimmed = trimResponseV2(parsed, opts.replyAs, members, characters, [
    'END_OF_DIALOG',
    'You:',
  ])

  yield trimmed || parsed
}

async function checkStreamSupported(versioncheckURL: any) {
  const result = await needle('get', versioncheckURL).catch((err) => ({ err }))
  if ('err' in result) {
    return false
  }

  if (result.statusCode !== 200 || result.errored) return false

  const { body } = result

  if (body.result !== 'KoboldCpp') return false
  const version: string = body.version ?? '0.0'

  const isSupportedVersion =
    version.localeCompare(MIN_STREAMING_KCPPVERSION, undefined, {
      numeric: true,
      sensitivity: 'base',
    }) > -1

  if (!isSupportedVersion) return false

  return true
}

const fullCompletion = async function* (genURL: string, body: any) {
  const resp = await needle('post', genURL, body, {
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
    return { tokens: text }
  } else {
    logger.error({ err: resp.body }, 'Failed to generate text using Kobold adapter')
    yield { error: `Kobold failed to generate a response: ${resp.body}` }
    return
  }
}

const streamCompletition = async function* (streamUrl: any, body: any) {
  const resp = needle.post(streamUrl, body, {
    parse: false,
    json: true,
    headers: {
      Accept: `text/event-stream`,
    },
  })

  const tokens = []

  try {
    const events = needleToSSE(resp)

    for await (const event of events) {
      if (!event.data) continue
      const data = JSON.parse(event.data) as {
        token: string
        final: boolean
        ptr: number
        error?: string
      }
      if (data.error) {
        yield { error: `Kobold streaming request failed: ${data.error}` }
        return
      }

      tokens.push(data.token)
      yield { token: data.token }
    }
  } catch (err: any) {
    yield { error: `Kobold streaming request failed: ${err.message || err}` }
    return
  }

  return { text: tokens.join('') }
}
