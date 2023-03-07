/**
 * The text-generation-webui is extraordinarly inconsistent.
 * For now this adapter will remain disabled until the API matures.
 *
 * Kobold and Ooba will likely be superseced by our own generation pipeline.
 */

import needle from 'needle'
import { config } from '../../config'
import { logger } from '../../logger'
import { sanitise, trimResponse } from '../chat/common'
import { ModelAdapter } from './type'

const base = {
  do_sample: true,
  temperature: 0.65,
  top_a: 0.0,
  top_p: 0.9,
  top_k: 0,
  typical_p: 1,
  repetition_penalty: 1.08,
  length_penalty: 1,
  penalty_alpha: 0,
  no_repeat_ngram_size: 0,
  max_new_tokens: config.kobold.maxLength,
  early_stopping: false,
  min_length: 0,
  num_beams: 1,
  max_context_length: 2048,
}

const defaultUrl = `http://127.0.0.1:7860`

export const handleOoba: ModelAdapter = async function* ({ char, members, user, prompt, sender }) {
  const body = [
    prompt,
    base.max_new_tokens,
    base.do_sample,
    base.temperature,
    base.top_p,
    base.typical_p,
    base.repetition_penalty,
    base.top_k,
    base.min_length,
    base.no_repeat_ngram_size,
    base.num_beams,
    base.penalty_alpha,
    base.length_penalty,
    base.early_stopping,
    char.name,
    sender.handle,
    true, // Stop at line break
    base.max_context_length,
    1,
  ]

  const resp = await needle(
    'post',
    `${user.oobaUrl || defaultUrl}/run/textgen`,
    { data: body },
    { json: true, timeout: 2000, response_timeout: 10000 }
  ).catch((err) => ({ error: err }))
  if ('error' in resp) {
    yield { error: `text-generatuin-webui request failed: ${resp.error?.message || resp.error}` }
    return
  }

  if (resp.statusCode && resp.statusCode >= 400) {
    yield { error: `text-generation-webui request failed: ${resp.statusMessage}` }
    return
  }

  try {
    const text = resp.body.data[0]
    if (!text) {
      yield { error: `text-generation-webui request failed: Received empty response. Try again.` }
      return
    }
    const parsed = sanitise(text.replace(prompt, ''))
    const trimmed = trimResponse(parsed, char, members, ['END_OF_DIALOG'])
    yield trimmed ? trimmed.response : parsed
  } catch (ex: any) {
    yield { error: `text-generation-webui request failed: ${ex.message}` }
    return
  }
}
