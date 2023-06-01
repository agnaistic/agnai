import { wrap } from '../wrap'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import { assertValid } from '/common/valid'
import { store } from '/srv/db'

/**
 * WIP
 * Handler for arbitrary generation -- not for messages
 */

export const plainGenerate = wrap(async ({ socketId, userId, body }, res) => {
  assertValid({ prompt: 'string', settings: 'any' }, body)

  let { settings } = body
  if (userId) {
    const id = settings._id as string
    settings = isDefaultPreset(id) ? defaultPresets[id] : await store.presets.getUserPreset(id)
  }

  /**
   * TODO:
   * - Reduce AdapterProps to minimum essentials to perform non-message prompts
   */
})
