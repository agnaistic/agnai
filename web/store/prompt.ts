import { storage } from '../shared/util'
import { createStore } from './create'

export type PromptState = {
  hintsEnabled: boolean
  hint: string
  imageHint: string
}

const KEYS = {
  HINTS_ENABLED: `prompt-settings-enabled-hints`,
  LAST_HINT: `prompt-settings-last-hint`,
  LAST_IMAGE_HINT: `prompt-settings-last-image-hint`,
}

export const promptStore = createStore<PromptState>(
  'prompt',
  {
    hint: storage.localGetItem(KEYS.LAST_HINT) || '',
    hintsEnabled: storage.localGetItem(KEYS.HINTS_ENABLED) === 'true',

    imageHint: storage.localGetItem(KEYS.LAST_IMAGE_HINT) || '',
  },
  { quiet: true }
)(() => {
  return {
    toggleHints: (_, next: boolean) => {
      storage.localSetItem(KEYS.HINTS_ENABLED, JSON.stringify(next))
      return { hintsEnabled: next }
    },
    hint: (_, text: string) => {
      storage.localSetItem(KEYS.LAST_HINT, text)
      return { hint: (text || '').trim() }
    },
    imageHint: (_, text: string) => {
      storage.localSetItem(KEYS.LAST_IMAGE_HINT, text)
      return { imageHint: text }
    },
  }
})
