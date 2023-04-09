/**
 * The text-generation-webui is extraordinarly inconsistent.
 * For now this adapter will remain disabled until the API matures.
 *
 * Kobold and Ooba will likely be superseced by our own generation pipeline.
 */

import needle from 'needle'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter } from './type'

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
  }

  const payload = [JSON.stringify([prompt, body])]

  log.debug({ payload }, 'Textgen payload')

  const resp = await needle(
    'post',
    `${user.oobaUrl || defaultUrl}/run/textgen`,
    { data: payload },
    { json: true }
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
    const trimmed = trimResponseV2(parsed, char, members, ['END_OF_DIALOG'])
    yield trimmed || parsed
  } catch (ex: any) {
    yield { error: `text-generation-webui request failed: ${ex.message}` }
    return
  }
}
