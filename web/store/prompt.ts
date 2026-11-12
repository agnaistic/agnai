import { storage } from '../shared/util'
import { createStore } from './create'

export type PromptState = {
  hintsEnabled: boolean
  hintId: string
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
    hintId: '',
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
    loadHint: (_, chatId: string) => {
      const hint = storage.localGetItem(hintKey(chatId)) || ''
      if (hint) {
        return { hintId: chatId, hint }
      }

      const legacy = storage.localGetItem(KEYS.LAST_HINT)
      if (!legacy) {
        return { hintId: chatId, hint: '' }
      }

      storage.localRemoveItem(KEYS.LAST_HINT)
      storage.localSetItem(hintKey(chatId), legacy)
      return { hintId: chatId, hint: legacy }
    },
    hint: (_, opts: { chatId: string; text: string }) => {
      storage.localSetItem(hintKey(opts.chatId), opts.text)
      return { hintId: opts.chatId, hint: opts.text }
    },
    imageHint: (_, opts: { chatId: string; text: string }) => {
      const id = `image-hint-${opts.chatId}`
      storage.localSetItem(id, opts.text)
      storage.localRemoveItem(KEYS.LAST_IMAGE_HINT)
      return { imageHint: opts.text }
    },
    loadImageHint: (_, chatId: string) => {
      const id = `image-hint-${chatId}`
      const prev = storage.localGetItem(id)
      if (prev) {
        return { imageHint: prev }
      }

      const fallback = storage.localGetItem(KEYS.LAST_IMAGE_HINT)
      if (fallback) {
        storage.localSetItem(id, fallback)
        return { imageHint: fallback }
      }

      return { imageHint: '' }
    },
  }
})

function hintKey(chatId: string) {
  return `${KEYS.LAST_HINT}_${chatId}`
}
