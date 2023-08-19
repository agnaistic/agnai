import needle from 'needle'
import { normalizeUrl, sanitise, sanitiseAndTrim, trimResponseV2 } from '../api/chat/common'
import { AdapterProps, ModelAdapter } from './type'
import { websocketStream } from './stream'
import { getStoppingStrings } from './prompt'

export const handleOoba: ModelAdapter = async function* (opts) {
  const { char, members, user, prompt, log, gen } = opts
  const body = {
    prompt,
    max_new_tokens: gen.maxTokens,
    do_sample: gen.doSample ?? true,
    temperature: gen.temp,
    top_p: gen.topP,
    typical_p: gen.typicalP || 1,
    repetition_penalty: gen.repetitionPenalty,
    encoder_repetition_penalty: gen.encoderRepitionPenalty,
    top_k: gen.topK,
    min_length: 0,
    no_repeat_ngram_size: 0,
    num_beams: 1,
    penalty_alpha: gen.penaltyAlpha,
    length_penalty: 1,
    early_stopping: true,
    seed: -1,
    add_bos_token: gen.addBosToken || false,
    truncation_length: gen.maxContextLength || 2048,
    ban_eos_token: gen.banEosToken || false,
    skip_special_tokens: gen.skipSpecialTokens ?? true,
    stopping_strings: getStoppingStrings(opts),
  }

  yield { prompt: body.prompt }

  log.debug({ ...body, prompt: null }, 'Textgen payload')

  if (opts.kind === 'continue') {
    body.prompt = body.prompt.split('\n').slice(0, -1).join('\n')
  }

  log.debug(`Prompt:\n${body.prompt}`)

  const url = gen.thirdPartyUrl || user.koboldUrl
  const baseUrl = normalizeUrl(url)
  const resp = gen.streamResponse
    ? await websocketStream({ url: baseUrl + '/api/v1/stream', body })
    : getCompletion(`${baseUrl}/api/v1/generate`, body, {})

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

async function* getCompletion(url: string, payload: any, headers: any): AsyncGenerator<any> {
  const resp = await needle('post', url, JSON.stringify(payload), {
    json: true,
    headers: Object.assign(headers, { Accept: 'application/json' }),
  }).catch((err) => ({ err }))

  if ('err' in resp) {
    yield { error: `Textgen request failed: ${resp.err.message || resp.err}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    const msg =
      resp.body.message || resp.body.error?.message || resp.statusMessage || 'Unknown error'
    yield { error: `Textgen request failed (${resp.statusCode}): ${msg}` }
    return
  }

  try {
    const text = resp.body.results?.[0]?.text
    if (!text) {
      yield {
        error: `Textgen request failed: Received empty response (potentially OOM). Try again.`,
      }
      return
    }
    yield { token: text }
    return text
  } catch (ex: any) {
    yield { error: `Textgen request failed: ${ex.message || ex}` }
  }
}

function getPayload({ gen, prompt }: AdapterProps) {
  if (gen.thirdPartyFormat === 'llamacpp') {
    const body = {
      prompt,
      temperature: gen.temp,
      top_k: gen.topK,
      top_p: gen.topP,
      n_predict: gen.maxTokens,
      stop: [],
      stream: true,
      frequency_penality: gen.frequencyPenalty,
      presence_penalty: gen.presencePenalty,
      mirostat: gen.mirostatTau ? 2 : 0,
      mirostat_tau: gen.mirostatTau,
      mirostat_eta: gen.mirostatLR,
      seed: -1,
      typical_p: gen.typicalP,
      ignore_eos: gen.banEosToken,
      repeat_penality: gen.repetitionPenalty,
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
    top_k: gen.topK,
    min_length: 0,
    no_repeat_ngram_size: 0,
    num_beams: 1,
    penalty_alpha: gen.penaltyAlpha,
    length_penalty: 1,
    early_stopping: true,
    seed: -1,
    add_bos_token: gen.addBosToken || false,
    truncation_length: gen.maxContextLength || 2048,
    ban_eos_token: gen.banEosToken || false,
    skip_special_tokens: gen.skipSpecialTokens ?? true,
    stopping_strings: [],
  }
  return body
}
