import { createStore } from './create'

export type PromptState = {
  hintsEnabled: boolean
  hint: string
}

export const promptStore = createStore<PromptState>(
  'prompt',
  { hint: '', hintsEnabled: false },
  { quiet: true }
)(() => {
  return {
    toggleHints: (_, next: boolean) => {
      return { hintsEnabled: next }
    },
    hint: (_, text: string) => {
      return { hint: (text || '').trim() }
    },
  }
})
