import needle from 'needle'
import { normalizeUrl, sanitise, sanitiseAndTrim, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter } from './type'
import { websocketStream } from './stream'

export const handleOoba: ModelAdapter = async function* ({
  char,
  members,
  user,
  prompt,
  mappedSettings,
  log,
  gen,
  ...opts
}) {
  const body = {
    prompt,
    max_new_tokens: mappedSettings.maxTokens,
    do_sample: true,
    temperature: mappedSettings.temperature,
    top_p: mappedSettings.top_p,
    typical_p: mappedSettings.typical_p || 1,
    repetition_penalty: mappedSettings.repetition_penalty,
    encoder_repetition_penalty: mappedSettings.encoder_repetition_penalty,
    top_k: mappedSettings.top_k,
    min_length: 0,
    no_repeat_ngram_size: 0,
    num_beams: 1,
    penalty_alpha: mappedSettings.penalty_alpha,
    length_penalty: 1,
    early_stopping: true,
    seed: -1,
    add_bos_token: mappedSettings.add_bos_token || false,
    truncation_length: mappedSettings.maxContextLength || 2048,
    ban_eos_token: mappedSettings.ban_eos_token || false,
    skip_special_tokens: mappedSettings.skipSpecialTokens ?? true,
    stopping_strings: [],
  }

  yield { prompt: body.prompt }

  log.debug({ ...body, prompt: null }, 'Textgen payload')
  log.debug(`Prompt:\n${body.prompt}`)

  const url = gen.thirdPartyUrl || user.koboldUrl
  const fullUrl = `${normalizeUrl(url)}/api/v1/generate`
  const resp = gen.streamResponse
    ? await websocketStream({ url: normalizeUrl(url) + '/api/v1/stream', body })
    : getCompletion(fullUrl, body, {})

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
