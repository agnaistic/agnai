import needle from 'needle'
import { defaultPresets } from '../../common/presets'
import { AppLog, logger } from '../logger'
import { normalizeUrl, sanitise, sanitiseAndTrim, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter } from './type'
import { requestStream } from './stream'
import { getTextgenPayload, llamaStream } from './ooba'
import { getStoppingStrings } from './prompt'

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

export const handleKobold: ModelAdapter = async function* (opts) {
  const { members, characters, user, prompt, mappedSettings } = opts

  const body =
    opts.gen.thirdPartyFormat === 'llamacpp'
      ? getTextgenPayload(opts)
      : { ...base, ...mappedSettings, prompt }

  const baseURL = `${normalizeUrl(user.koboldUrl)}`

  // Kobold has a stop requence parameter which automatically
  // halts generation when a certain token is generated
  if (opts.gen.thirdPartyFormat !== 'llamacpp') {
    const stop_sequence = getStoppingStrings(opts).concat('END_OF_DIALOG')
    body.stop_sequence = stop_sequence

    // Kobold sampler order parameter must contain all 6 samplers to be valid
    // If the sampler order is provided, but incomplete, add the remaining samplers.
    if (typeof body.sampler_order === 'string') {
      body.sampler_order = (body.sampler_order as string).split(',').map((val) => +val)
    }

    if (body.sampler_order && body.sampler_order.length !== 6) {
      for (const sampler of REQUIRED_SAMPLERS) {
        if (body.sampler_order.includes(sampler)) continue

        body.sampler_order.push(sampler)
      }
    }
  }

  yield { prompt: body.prompt }

  logger.debug({ ...body, prompt: null }, 'Kobold payload')
  logger.debug(`Prompt:\n${body.prompt}`)

  // Only KoboldCPP at version 1.30 and higher has streaming support
  const isStreamSupported =
    opts.gen.thirdPartyFormat === 'llamacpp'
      ? true
      : await checkStreamSupported(`${baseURL}/api/extra/version`)

  const stream =
    opts.gen.thirdPartyFormat === 'llamacpp'
      ? llamaStream(baseURL, body)
      : opts.gen.streamResponse && isStreamSupported
      ? streamCompletition(`${baseURL}/api/extra/generate/stream`, body, opts.log)
      : fullCompletion(`${baseURL}/api/v1/generate`, body, opts.log)

  let accum = ''

  while (true) {
    const generated = await stream.next()

    if (!generated || !generated.value) break

    if (typeof generated.value === 'string') {
      accum = generated.value
      break
    }

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

  return isSupportedVersion
}

const fullCompletion = async function* (genURL: string, body: any, log: AppLog) {
  const resp = await needle('post', genURL, body, {
    headers: { 'Bypass-Tunnel-Reminder': 'true' },
    json: true,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    yield { error: `Kobold request failed: ${resp.error?.message || resp.error}` }
    log.error({ error: resp.error }, `Kobold request failed`)
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    yield { error: `Kobold request failed: ${resp.statusMessage}` }
    log.error({ error: resp.body }, `Kobold request failed`)
    return
  }

  const text = resp.body.results?.[0]?.text as string

  if (text) {
    return { tokens: text }
  } else {
    log.error({ err: resp.body }, 'Failed to generate text using Kobold adapter')
    yield { error: `Kobold failed to generate a response: ${resp.body}` }
    return
  }
}

const streamCompletition = async function* (streamUrl: any, body: any, log: AppLog) {
  const resp = needle.post(streamUrl, body, {
    parse: false,
    json: true,
    headers: {
      Accept: `text/event-stream`,
    },
  })

  const tokens = []

  try {
    const events = requestStream(resp)

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
        log.error({ error: data.error }, 'Kobold streaming request failed')
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
