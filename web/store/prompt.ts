import { createStore } from './create'

export type PromptState = {
  hint: string
}

export const promptStore = createStore<PromptState>(
  'prompt',
  { hint: '' },
  { quiet: true }
)(() => {
  return {
    hint: (_, text: string) => {
      return { hint: (text || '').trim() }
    },
  }
})
