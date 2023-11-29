import needle from 'needle'
import { normalizeUrl, sanitise, sanitiseAndTrim, trimResponseV2 } from '../api/chat/common'
import { AdapterProps, ModelAdapter } from './type'
import { websocketStream } from './stream'
import { getStoppingStrings } from './prompt'
import { eventGenerator } from '/common/util'

export const handleOoba: ModelAdapter = async function* (opts) {
  const { char, members, user, prompt, log, gen } = opts
  const body = getThirdPartyPayload(opts)

  yield { prompt }

  log.debug({ ...body, prompt: null }, 'Textgen payload')

  log.debug(`Prompt:\n${prompt}`)

  const url = gen.thirdPartyUrl || user.oobaUrl
  const baseUrl = normalizeUrl(url)
  const resp =
    opts.gen.service === 'kobold' && opts.gen.thirdPartyFormat === 'llamacpp'
      ? llamaStream(baseUrl, body)
      : gen.streamResponse
      ? await websocketStream({ url: baseUrl + '/api/v1/stream', body })
      : getTextgenCompletion('Textgen', `${baseUrl}/api/v1/generate`, body, {})

  let accumulated = ''
  let result = ''

  while (true) {
    let generated = await resp.next()

    // Both the streaming and non-streaming generators return a full completion and yield errors.
    if (generated.done) {
      break
    }

    if (generated.value.error) {
      yield generated.value
      return
    }

    // Only the streaming generator yields individual tokens.
    if (generated.value.token) {
      accumulated += generated.value.token
      yield { partial: sanitiseAndTrim(accumulated, prompt, char, opts.characters, members) }
    }

    if (typeof generated.value === 'string') {
      result = generated.value
      break
    }
  }

  const parsed = sanitise((result || accumulated).replace(prompt, ''))
  const trimmed = trimResponseV2(parsed, opts.replyAs, members, opts.characters, ['END_OF_DIALOG'])
  yield trimmed || parsed
}

export async function* getTextgenCompletion(
  service: string,
  url: string,
  payload: any,
  headers: any
): AsyncGenerator<any> {
  const resp = await needle('post', url, JSON.stringify(payload), {
    json: true,
    headers: Object.assign(headers, { Accept: 'application/json' }),
  }).catch((err) => ({ err }))

  if ('err' in resp) {
    if ('syscall' in resp.err && 'code' in resp.err) {
      yield { error: `${service} request failed: Service unreachable - ${resp.err.code}` }
      return
    }

    yield { error: `${service} request failed: ${resp.err.message || resp.err}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    const msg =
      resp.body.message || resp.body.error?.message || resp.statusMessage || 'Unknown error'
    yield { error: `${service} request failed (${resp.statusCode}): ${msg}` }
    return
  }

  try {
    const text = resp.body.results?.[0]?.text
    if (!text) {
      yield {
        error: `${service} request failed: Received empty response. Please try again.`,
      }
      return
    }
    yield { token: text }
    return text
  } catch (ex: any) {
    yield { error: `${service} request failed: ${ex.message || ex}` }
  }
}

export function getThirdPartyPayload(opts: AdapterProps, stops: string[] = []) {
  const { gen, prompt } = opts
  if (gen.service === 'kobold' && gen.thirdPartyFormat === 'llamacpp') {
    const body = {
      prompt,
      temperature: gen.temp,
      min_p: gen.minP,
      top_k: gen.topK,
      top_p: gen.topP,
      n_predict: gen.maxTokens,
      stop: getStoppingStrings(opts, stops),
      stream: true,
      frequency_penality: gen.frequencyPenalty,
      presence_penalty: gen.presencePenalty,
      mirostat: gen.mirostatTau ? 2 : 0,
      mirostat_tau: gen.mirostatTau,
      mirostat_eta: gen.mirostatLR,
      seed: -1,
      typical_p: gen.typicalP,
      ignore_eos: gen.banEosToken,
      repeat_penalty: gen.repetitionPenalty,
      repeat_last_n: gen.repetitionPenaltyRange,
      tfs_z: gen.tailFreeSampling,
    }
    return body
  }

  if (gen.service === 'kobold' && gen.thirdPartyFormat === 'exllamav2') {
    const body = {
      request_id: opts.requestId,
      action: 'infer',
      text: prompt,
      stream: true,
      temperature: gen.temp,
      top_k: gen.topK,
      top_p: gen.topP,
      max_new_tokens: gen.maxTokens,
      stop_conditions: getStoppingStrings(opts, stops),
      typical: gen.typicalP,
      rep_pen: gen.repetitionPenalty,
      min_p: gen.minP,
    }
    return body
  }

  if (gen.service === 'kobold' && gen.thirdPartyFormat === 'koboldcpp') {
    const body = {
      n: 1,
      max_context_length: gen.maxContextLength,
      prompt,
      max_length: gen.maxTokens,
      rep_pen: gen.repetitionPenalty,
      temperature: gen.temp,
      tfs: gen.tailFreeSampling,
      min_p: gen.minP,
      top_p: gen.topP,
      top_k: gen.topK,
      top_a: gen.topA,
      typical: gen.typicalP,
      stop_sequence: getStoppingStrings(opts, stops),
      trim_stop: gen.trimStop,
      rep_pen_range: gen.repetitionPenaltyRange,
      rep_pen_slope: gen.repetitionPenaltySlope,
    }
    return body
  }

  const body = {
    prompt,
    max_new_tokens: gen.maxTokens,
    do_sample: gen.doSample ?? true,
    temperature: gen.temp,
    top_p: gen.topP,
    typical_p: gen.typicalP || 1,
    repetition_penalty: gen.repetitionPenalty,
    encoder_repetition_penalty: gen.encoderRepitionPenalty,
    repetition_penalty_range: gen.repetitionPenaltyRange,
    frequency_penalty: gen.frequencyPenalty,
    presence_penalty: gen.presencePenalty,
    top_k: gen.topK,
    min_p: gen.minP,
    top_a: gen.topA,
    min_length: 0,
    no_repeat_ngram_size: 0,
    num_beams: gen.numBeams || 1,
    penalty_alpha: gen.penaltyAlpha,
    length_penalty: 1,
    early_stopping: gen.earlyStopping || false,
    seed: -1,
    add_bos_token: gen.addBosToken || false,
    truncation_length: gen.maxContextLength || 2048,
    ban_eos_token: gen.banEosToken || false,
    skip_special_tokens: gen.skipSpecialTokens ?? true,
    stopping_strings: getStoppingStrings(opts, stops),
    tfs: gen.tailFreeSampling,
    mirostat_mode: gen.mirostatTau ? 2 : 0,
    mirostat_tau: gen.mirostatTau,
    mirostat_eta: gen.mirostatLR,
  }
  return body
}

export function llamaStream(host: string, payload: any) {
  const accums: string[] = []
  const resp = needle.post(host + '/completion', JSON.stringify(payload), {
    parse: false,
    json: true,
    headers: {
      Accept: `text/event-stream`,
    },
  })

  const emitter = eventGenerator<{ token?: string; response?: string; error?: string } | string>()
  resp.on('header', (code, _headers) => {
    if (code >= 201) {
      emitter.push({ error: `[${code}] Request failed` })
      emitter.done()
    }
  })

  resp.on('done', () => {
    emitter.push(accums.join(''))
    emitter.done()
  })

  resp.on('data', (chunk: Buffer) => {
    const data = chunk.toString()
    const messages = data.split(/\r?\n\r?\n/).filter((l) => !!l)

    for (const msg of messages) {
      const event: any = parseEvent(msg)

      if (!event.content) {
        continue
      }

      accums.push(event.content)
      emitter.push({ token: event.content })
    }
  })

  return emitter.stream
}

export function exllamaStream(host: string, payload: any) {
  const accums: string[] = []
  const resp = needle.post(host + '/completion', JSON.stringify(payload), {
    parse: false,
    json: true,
    headers: {
      Accept: `text/event-stream`,
    },
  })

  const emitter = eventGenerator<{ token?: string; response?: string; error?: string } | string>()
  resp.on('header', (code, _headers) => {
    if (code >= 201) {
      emitter.push({ error: `[${code}] Request failed` })
      emitter.done()
    }
  })

  resp.on('done', () => {
    emitter.push(accums.join(''))
    emitter.done()
  })

  resp.on('data', (chunk: Buffer) => {
    const data = chunk.toString()
    const messages = data.split(/\r?\n\r?\n/).filter((l) => !!l)

    for (const msg of messages) {
      const event: any = parseEvent(msg)

      if (!event.content) {
        continue
      }

      accums.push(event.content)
      emitter.push({ token: event.content })
    }
  })

  return emitter.stream
}

function parseEvent(msg: string) {
  const event: any = {}
  for (const line of msg.split(/\r?\n/)) {
    const pos = line.indexOf(':')
    if (pos === -1) {
      continue
    }

    const prop = line.slice(0, pos)
    const value = line.slice(pos + 1).trim()
    event[prop] = prop === 'data' ? value.trimStart() : value.trim()
    if (prop === 'data') {
      const data = JSON.parse(value)
      Object.assign(event, data)
    }
  }

  return event
}
