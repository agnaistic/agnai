/**
 * The Textgen is extraordinarly inconsistent.
 * For now this adapter will remain disabled until the API matures.
 *
 * Kobold and Ooba will likely be superseced by our own generation pipeline.
 */

import needle from 'needle'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter } from './type'
import { logger } from '../logger'

const defaultUrl = `http://127.0.0.1:7860`

export const handleOoba: ModelAdapter = async function* ({
  char,
  members,
  user,
  prompt,
  settings,
  log,
}) {
  const body = {
    max_new_tokens: settings.max_new_tokens,
    do_sample: true,
    temperature: settings.temperature,
    top_p: settings.top_p,
    typical_p: settings.typical_p || 1,
    repetition_penalty: settings.repetition_penalty,
    encoder_repetition_penalty: settings.encoder_repetition_penalty,
    top_k: settings.top_k,
    min_length: 0,
    no_repeat_ngram_size: 0,
    num_beams: 1,
    penalty_alpha: settings.penalty_alpha,
    length_penalty: 1,
    early_stopping: true,
    seed: -1,
    add_bos_token: settings.add_bos_token || false,
    custom_stopping_strings: [],
    truncation_length: 2048,
    ban_eos_token: settings.ban_eos_token || false,
  }

  const payload = [JSON.stringify([prompt, body])]

  log.debug({ prompt, body }, 'Textgen payload')

  const resp = await needle(
    'post',
    `${user.oobaUrl || defaultUrl}/run/textgen`,
    { data: payload },
    { json: true }
  ).catch((err) => ({ error: err }))
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
    const text = resp.body.data[0]
    if (!text) {
      yield {
        error: `Textgen request failed: Received empty response (potentially OOM). Try again.`,
      }
      return
    }
    const parsed = sanitise(text.replace(prompt, ''))
    const trimmed = trimResponseV2(parsed, char, members, ['END_OF_DIALOG'])
    yield trimmed || parsed
  } catch (ex: any) {
    yield { error: `Textgen request failed: ${ex.message}` }
    return
  }
}
