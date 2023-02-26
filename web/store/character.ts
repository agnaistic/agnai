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
  avatar?: File
  persona: AppSchema.CharacterPersona
}

export const characterStore = createStore<CharacterState>('character', {
  characters: { loaded: false, list: [] },
})((get, set) => {
  return {
    logout() {
      return { characters: { loaded: false, list: [] } }
    },
    getCharacters: async () => {
      const res = await api.get('/character')
      if (res.error) toastStore.error('Failed to retrieve characters')
      else {
        return { characters: { list: res.result.characters, loaded: true } }
      }
    },
    createCharacter: async (_, char: NewCharacter, onSuccess?: () => void) => {
      const form = new FormData()
      form.append('name', char.name)
      form.append('greeting', char.greeting)
      form.append('scenario', char.scenario)
      form.append('persona', JSON.stringify(char.persona))
      form.append('sampleChat', char.sampleChat)
      if (char.avatar) {
        form.append('avatar', char.avatar)
      }

      const res = await api.upload(`/character`, form)

      if (res.error) toastStore.error(`Failed to create character: ${res.error}`)
      if (res.result) {
        toastStore.success(`Successfully created character`)
        characterStore.getCharacters()
        onSuccess?.()
      }
    },
    editCharacter: async (_, characterId: string, char: NewCharacter, onSuccess?: () => void) => {
      const form = new FormData()
      form.append('name', char.name)
      form.append('greeting', char.greeting)
      form.append('scenario', char.scenario)
      form.append('persona', JSON.stringify(char.persona))
      form.append('sampleChat', char.sampleChat)
      if (char.avatar) {
        form.append('avatar', char.avatar)
      }

      const res = await api.upload(`/character/${characterId}`, form)

      if (res.error) toastStore.error(`Failed to create character: ${res.error}`)
      if (res.result) {
        toastStore.success(`Successfully updated character`)
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
