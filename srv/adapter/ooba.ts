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
  const body = [
    prompt,
    settings.max_new_tokens,
    true, // do_sample
    settings.top_p,
    settings.temperature,
    settings.typical_p || 1,
    settings.repetition_penalty,
    settings.encoder_repetition_penalty,
    settings.top_k,
    0, // no min_length
    0, // no_repeat_ngram_size
    1, // num_beams
    settings.penalty_alpha,
    1, // length_penalty
    true, // stop at line break
    -1, // random seed
  ]

  log.debug({ body }, 'Textgen payload')

  const resp = await needle(
    'post',
    `${user.oobaUrl || defaultUrl}/run/textgen`,
    { data: body },
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
