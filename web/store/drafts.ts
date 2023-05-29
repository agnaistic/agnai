import { createStore } from './create'

type DraftsState = {
  drafts: { [chatId: string]: string }
}

const initialDraftsState: DraftsState = {
  drafts: {},
}

function getLocalStorageKey(chatId: string): string {
  return `chat:${chatId}:draft`
}

export const draftStore = createStore<DraftsState>(
  'draft',
  initialDraftsState
)((get, set) => {
  function update(chatId: string, value: string): Partial<DraftsState> {
    const current = get().drafts

    if (value) {
      localStorage.setItem(getLocalStorageKey(chatId), value)
      return { drafts: { ...current, [chatId]: value } }
    } else {
      localStorage.removeItem(getLocalStorageKey(chatId))
      const { [chatId]: _, ...rest } = current
      return { drafts: rest }
    }
  }

  function restore(chatId: string): Partial<DraftsState> {
    const prev = get().drafts
    const draft = prev[chatId] ?? localStorage.getItem(getLocalStorageKey(chatId))
    return { drafts: { ...prev, [chatId]: draft } }
  }

  function clear(chatId: string): Partial<DraftsState> {
    const current = get().drafts

    localStorage.removeItem(getLocalStorageKey(chatId))
    const { [chatId]: _, ...rest } = current
    return { drafts: rest }
  }

  return {
    update: (_, chatId: string, value: string) => update(chatId, value),
    restore: (_, chatId: string) => restore(chatId),
    clear: (_, chatId: string) => clear(chatId),
  }
})
