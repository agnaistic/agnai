import { AppSchema } from '../../srv/db/schema'
import { api } from './api'
import { createStore } from './create'
import { toastStore } from './toasts'

type CharacterState = {
  characters: {
    loaded: boolean
    list: AppSchema.Character[]
  }
}

export type NewCharacter = {
  name: string
  greeting: string
  scenario: string
  sampleChat: string
  avatar?: string
  persona: AppSchema.CharacterPersona
}

export const characterStore = createStore<CharacterState>('character', {
  characters: { loaded: false, list: [] },
})((get, set) => {
  return {
    getCharacters: async () => {
      const res = await api.get('/character')
      if (res.error) toastStore.error('Failed to retrieve characters')
      else {
        return { characters: { list: res.result.characters, loaded: true } }
      }
    },
    createCharacter: async ({ characters }, char: NewCharacter, onSuccess?: () => void) => {
      const res = await api.post<AppSchema.Character>('/character', char)
      if (res.error) toastStore.error(`Failed to create character: ${res.error}`)
      if (res.result) {
        toastStore.success(`Successfully created character`)
        characterStore.getCharacters()
        onSuccess?.()
      }
    },
    deleteCharacter: async ({ characters: { list } }, charId: string, onSuccess?: () => void) => {
      const res = await api.method('delete', `/character/${charId}`)
      if (res.error) return toastStore.error(`Failed to delete character`)
      if (res.result) {
        const next = list.filter((char) => char._id !== charId)
        toastStore.success('Successfully deleted character')
        onSuccess?.()
        return {
          characters: { loaded: true, list: next },
        }
      }
    },
  }
})
