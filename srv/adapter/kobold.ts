import needle from 'needle'
import { defaultPresets } from '../../common/presets'
import { AppLog, logger } from '../middleware'
import { normalizeUrl } from '../api/chat/common'
import { AdapterProps, ModelAdapter } from './type'
import { requestStream } from './stream'
import { llamaStream } from './dispatch'
import { getStoppingStrings } from './prompt'
import { ThirdPartyFormat } from '/common/adapters'
import { decryptText } from '../db/util'
import { getThirdPartyPayload } from './payloads'
import * as oai from './stream'
import { toSamplerOrder } from '/common/sampler-order'
import { sanitise, sanitiseAndTrim, trimResponseV2 } from '/common/requests/util'

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

export const handleThirdParty: ModelAdapter = async function* (opts) {
  const { members, characters, prompt, mappedSettings } = opts

  const body =
    opts.gen.thirdPartyFormat === 'vllm' ||
    opts.gen.thirdPartyFormat === 'ollama' ||
    opts.gen.thirdPartyFormat === 'ooba' ||
    opts.gen.thirdPartyFormat === 'mistral' ||
    opts.gen.thirdPartyFormat === 'tabby' ||
    opts.gen.thirdPartyFormat === 'aphrodite' ||
    opts.gen.thirdPartyFormat === 'llamacpp' ||
    opts.gen.thirdPartyFormat === 'exllamav2' ||
    opts.gen.thirdPartyFormat === 'koboldcpp' ||
    opts.gen.thirdPartyFormat === 'featherless' ||
    opts.gen.thirdPartyFormat === 'arli'
      ? getThirdPartyPayload(opts)
      : { ...base, ...mappedSettings, prompt }

  // Kobold has a stop sequence parameter which automatically
  // halts generation when a certain token is generated
  const stop_sequence = getStoppingStrings(opts).concat('END_OF_DIALOG')
  if (opts.gen.thirdPartyFormat === 'kobold' || opts.gen.thirdPartyFormat === 'koboldcpp') {
    body.stop_sequence = stop_sequence

    // Kobold sampler order parameter must contain all 6 samplers to be valid
    // If the sampler order is provided, but incomplete, add the remaining samplers.
    const samplers = toSamplerOrder('kobold', opts.gen.order, opts.gen.disabledSamplers)
    if (samplers) {
      body.sampler_order = samplers.order
    } else {
      delete body.sampler_order
    }

    if (body.sampler_order && body.sampler_order.length !== 6) {
      for (const sampler of REQUIRED_SAMPLERS) {
        if (body.sampler_order.includes(sampler)) continue

        body.sampler_order.push(sampler)
      }
    }
  }

  yield { prompt: body.prompt }

  logger.debug(`Prompt:\n${body.prompt}`)
  logger.debug(
    { ...body, prompt: null, images: null, messages: null },
    `3rd-party payload ${opts.gen.thirdPartyFormat}`
  )

  const stream = await dispatch(opts, body)

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
      const gens = 'gens' in generated.value ? generated.value.gens : undefined
      if (gens) {
        yield { gens, tokens: generated.value.tokens }
      }

      accum = generated.value.tokens
      break
    }
  }

  if (opts.gen.service === 'kobold' && body.model) {
    yield { meta: { model: body.model, fmt: opts.gen.thirdPartyFormat } }
  }

  const parsed = sanitise(accum)
  const trimmed = trimResponseV2(parsed, opts.replyAs, members, characters, stop_sequence)

  yield trimmed || parsed
}

async function dispatch(opts: AdapterProps, body: any) {
  const baseURL = normalizeUrl(opts.gen.thirdPartyUrl || opts.user.koboldUrl)

  const headers: any = await getHeaders(opts)
  await validateModel(opts, baseURL, body, headers)

  switch (opts.gen.thirdPartyFormat) {
    case 'llamacpp':
      return llamaStream(baseURL, body)

    case 'vllm': {
      const url = opts.gen.thirdPartyUrlNoSuffix
        ? baseURL
        : body.messages
        ? `${baseURL}/v1/chat/completions`
        : `${baseURL}/v1/completions`
      return opts.gen.streamResponse
        ? streamCompletion(url, body, headers, opts.gen.thirdPartyFormat, opts.log)
        : fullCompletion(url, body, headers, opts.gen.thirdPartyFormat, opts.log)
    }

    case 'ooba':
    case 'aphrodite':
    case 'tabby': {
      const url = opts.gen.thirdPartyUrlNoSuffix ? baseURL : `${baseURL}/v1/completions`
      return opts.gen.streamResponse
        ? streamCompletion(url, body, headers, opts.gen.thirdPartyFormat, opts.log)
        : fullCompletion(url, body, headers, opts.gen.thirdPartyFormat, opts.log)
    }

    case 'exllamav2': {
      return opts.gen.streamResponse
        ? streamCompletion(baseURL, body, headers, opts.gen.thirdPartyFormat, opts.log)
        : fullCompletion(baseURL, body, headers, opts.gen.thirdPartyFormat, opts.log)
    }

    case 'mistral': {
      const url = 'https://api.mistral.ai/v1/chat/completions'
      const stream = opts.gen.streamResponse
        ? oai.streamCompletion(opts.user._id, url, headers, body, 'mistral', opts.log)
        : fullCompletion(url, body, headers, 'mistral', opts.log)
      return stream
    }

    case 'ollama': {
      const url = `${baseURL}/api/generate`
      return opts.gen.streamResponse
        ? streamCompletion(url, body, headers, opts.gen.thirdPartyFormat, opts.log)
        : fullCompletion(url, body, headers, opts.gen.thirdPartyFormat, opts.log)
    }

    case 'featherless': {
      const url = 'https://api.featherless.ai/v1/completions'
      return opts.gen.streamResponse
        ? streamCompletion(url, body, headers, opts.gen.thirdPartyFormat, opts.log)
        : fullCompletion(url, body, headers, opts.gen.thirdPartyFormat, opts.log)
    }

    case 'arli': {
      const url = 'https://api.arliai.com/v1/completions'
      return opts.gen.streamResponse
        ? streamCompletion(url, body, headers, opts.gen.thirdPartyFormat, opts.log)
        : fullCompletion(url, body, headers, opts.gen.thirdPartyFormat, opts.log)
    }

    default:
      const isStreamSupported = await checkStreamSupported(`${baseURL}/api/extra/version`)
      return opts.gen.streamResponse && isStreamSupported
        ? streamCompletion(
            `${baseURL}/api/extra/generate/stream`,
            body,
            'koboldcpp',
            headers,
            opts.log
          )
        : fullCompletion(
            `${baseURL}/api/v1/generate`,
            body,
            headers,
            opts.gen.thirdPartyFormat || opts.gen.service!,
            opts.log
          )
  }
}

async function getHeaders(opts: AdapterProps) {
  const password = opts.gen.thirdPartyUrl ? opts.gen.thirdPartyKey : opts.user.thirdPartyPassword
  const headers: any = {}

  switch (opts.gen.thirdPartyFormat) {
    case 'aphrodite': {
      if (!password) return headers
      const apiKey = opts.guest ? password : decryptText(password)
      headers['x-api-key'] = apiKey
      headers['Authorization'] = `Bearer ${apiKey}`
      break
    }

    case 'vllm': {
      if (!password) return headers
      const apiKey = opts.guest ? password : decryptText(password)
      headers['Authorization'] = `Bearer ${apiKey}`
      headers['Accept'] = 'application/json'
      break
    }
    case 'tabby': {
      if (!password) return headers
      const apiKey = opts.guest ? password : decryptText(password)
      headers['Authorization'] = `Bearer ${apiKey}`
      break
    }

    case 'featherless': {
      if (!opts.gen.featherlessModel) {
        throw new Error(`Featherless model not set. Check your preset`)
      }

      const key = opts.gen.thirdPartyKey || opts.user.featherlessApiKey
      if (!key) {
        throw new Error(
          `Featherless API key not set. Check your Settings->AI->Third-party settings`
        )
      }

      const apiKey = key ? (opts.guest ? key : decryptText(key)) : ''
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }
      headers['Content-Type'] = 'application/json'
      break
    }

    case 'arli': {
      if (!opts.gen.arliModel) {
        throw new Error(`ArliAI model not set. Check your preset`)
      }

      const key = opts.gen.thirdPartyKey || opts.user.arliApiKey
      if (!key) {
        throw new Error(`ArliAI API key not set. Check your Settings->AI->Third-party settings`)
      }

      const apiKey = key ? (opts.guest ? key : decryptText(key)) : ''
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }
      headers['Content-Type'] = 'application/json'
      break
    }

    case 'mistral': {
      const key = opts.user.mistralKey
      if (!key)
        throw new Error(`Mistral API key not set. Check your Settings->AI->Third-party settings`)

      const apiKey = opts.guest ? key : decryptText(key)
      headers['Authorization'] = `Bearer ${apiKey}`
      headers['Content-Type'] = 'application/json'
      break
    }
  }

  return headers
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

const fullCompletion = async function* (
  genURL: string,
  body: any,
  headers: any,
  service: string,
  log: AppLog
) {
  const resp = await needle('post', genURL, body, {
    headers: { 'Bypass-Tunnel-Reminder': 'true', ...headers },
    json: true,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    yield { error: `${service} request failed: ${resp.error?.message || resp.error}` }
    log.error({ error: resp.error }, `${service} request failed`)
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    yield { error: `${service} request failed: ${resp.statusMessage}` }
    log.error({ error: resp.body }, `${service} request failed`)
    return
  }

  if ('choices' in resp.body) {
    const first = resp.body.choices[0]
    const text = first.message ? first.message.content : first.text

    const gens: string[] = []
    for (const choice of resp.body.choices) {
      if (!choice.index || choice.index === 0) continue
      const text = choice.message ? choice.message.content : choice.text
      gens.push(text)
    }

    return gens.length ? { tokens: text, gens } : { tokens: text }
  }

  const text = resp.body.results?.[0]?.text as string

  if (text) {
    return { tokens: text }
  } else {
    log.error({ err: resp.body }, `Failed to generate text using ${service} adapter`)
    yield { error: `${service} failed to generate a response: ${resp.body}` }
    return
  }
}

const streamCompletion = async function* (
  streamUrl: any,
  body: any,
  headers: any,
  format: ThirdPartyFormat,
  log: AppLog
) {
  const resp = needle.post(streamUrl, body, {
    parse: false,
    json: true,
    headers: {
      Accept: format === 'featherless' ? 'application/json' : `text/event-stream`,
      ...headers,
    },
  })

  const tokens = []

  const responses: Record<number, string> = {}

  try {
    const events = requestStream(resp, format)

    for await (const event of events) {
      if (event?.error) {
        yield { error: event.error }
        return
      }

      if (!event.data) continue
      const data = JSON.parse(event.data) as {
        index?: number
        token: string
        final: boolean
        ptr: number
        error?: string
        choices?: Array<{ index: number; finish_reason: string; logprobs: any; text: string }>
      }

      if (data.error) {
        yield { error: `${format} streaming request failed: ${data.error}` }
        log.error({ error: data.error }, `${format} streaming request failed`)
        return
      }

      const res = data.choices ? data.choices[0] : data
      const token = 'text' in res ? res.text : res.token

      /** Handle batch generations */
      if (res.index !== undefined) {
        const index = res.index
        if (!responses[index]) {
          responses[index] = ''
        }

        responses[index] += token

        if (index === 0) {
          tokens.push(token)
          yield { token: token }
        }

        continue
      }

      tokens.push(token)
      yield { token }
    }
  } catch (err: any) {
    yield { error: `${format} streaming request failed: ${err.message || err}` }
    return
  }

  const gens: string[] = []
  for (const [id, text] of Object.entries(responses)) {
    if (+id === 0) continue
    gens.push(text)
  }

  return gens.length ? { tokens: tokens.join(''), gens } : { tokens: tokens.join('') }
}

async function validateModel(opts: AdapterProps, baseURL: string, payload: any, headers: any) {
  if (opts.gen.thirdPartyFormat === 'aphrodite') {
    const res = await needle('get', `${baseURL}/v1/models`, { headers, json: true })

    const code = res.statusCode ?? 400
    if (code >= 400) {
      return
    }

    if (!Array.isArray(res.body.data)) return
    const names = res.body.data.map((data: any) => data.id) as string[]

    if (!payload.model || !names.includes(payload.model)) {
      payload.model = names[0]
    }
  }

  if (opts.gen.thirdPartyFormat === 'ollama') {
    const res = await needle('get', `${baseURL}/api/tags`, { headers, json: true })
    const code = res.statusCode ?? 400
    if (code >= 400) {
      return
    }

    if (!Array.isArray(res.body.models)) return
    const models = res.body.models as Array<{ name: string; model: string }>
    if (!models.length) return

    if (!payload.model) {
      payload.model = models[0].name
      return
    }

    const paylow: string = (payload.model || '').toLowerCase()
    const match = models.find((m) => {
      const low = m.name.toLowerCase()
      if (low === paylow) return true
      if (low.includes(':')) {
        const [name] = m.name.split(':')
        if (name === paylow) return true
        if (name.startsWith(paylow)) return true
      }

      return low.startsWith(paylow)
    })
    if (!match) {
      payload.model = models[0].name
      return
    }
  }
}
