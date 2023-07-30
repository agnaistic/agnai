import needle from 'needle'
import { normalizeUrl, sanitise, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter } from './type'
import { logger } from '../logger'

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
  const resp = await needle('post', `${normalizeUrl(url)}/api/v1/generate`, body, {
    json: true,
  }).catch((err) => ({ error: err }))

  if ('error' in resp) {
    logger.error({ err: resp.error }, ``)
    yield { error: `Textgen request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    logger.error({ err: resp.body }, `Textgen request failed {${resp.statusCode}}`)
    yield {
      error: `Textgen request failed (${resp.statusCode}) ${
        resp.body.error || resp.body.message || resp.statusMessage
      }`,
    }
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
    const parsed = sanitise(text.replace(prompt, ''))
    const trimmed = trimResponseV2(parsed, opts.replyAs, members, opts.characters, [
      'END_OF_DIALOG',
    ])
    yield trimmed || parsed
  } catch (ex: any) {
    yield { error: `Textgen request failed: ${ex.message}` }
    return
  }
}
