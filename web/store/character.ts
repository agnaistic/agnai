import { AppSchema } from '../../srv/db/schema'
import { EVENTS, events } from '../emitter'
import { createStore } from './create'
import { data } from './data'
import { toastStore } from './toasts'

type CharacterState = {
  loading?: boolean
  characters: {
    loaded: boolean
    list: AppSchema.Character[]
  }
  creating: boolean
}

export type NewCharacter = {
  name: string
  description?: string
  greeting: string
  scenario: string
  sampleChat: string
  avatar?: File
  persona: AppSchema.Persona
  originalAvatar?: any
}

const initState: CharacterState = {
  creating: false,
  characters: { loaded: false, list: [] },
}

export const characterStore = createStore<CharacterState>(
  'character',
  initState
)((get, set) => {
  events.on(EVENTS.loggedOut, () => {
    characterStore.setState(initState)
  })

  return {
    async *getCharacters(state) {
      if (state.loading) return

      yield { loading: true }
      const res = await data.chars.getCharacters()
      yield { loading: false }

      if (res.error) toastStore.error('Failed to retrieve characters')
      if (res.result) {
        return { characters: { list: res.result.characters, loaded: true } }
      }
    },
    async *createCharacter({ creating }, char: NewCharacter, onSuccess?: () => void) {
      if (creating) return

      yield { creating: true }
      const res = await data.chars.createCharacter(char)
      yield { creating: false }
      if (res.error) toastStore.error(`Failed to create character: ${res.error}`)
      if (res.result) {
        toastStore.success(`Successfully created character`)
        characterStore.getCharacters()
        onSuccess?.()
      }
    },
    editCharacter: async (_, characterId: string, char: NewCharacter, onSuccess?: () => void) => {
      const res = await data.chars.editChracter(characterId, char)

      if (res.error) toastStore.error(`Failed to create character: ${res.error}`)
      if (res.result) {
        toastStore.success(`Successfully updated character`)
        characterStore.getCharacters()
        onSuccess?.()
      }
    },
    deleteCharacter: async ({ characters: { list } }, charId: string, onSuccess?: () => void) => {
      const res = await data.chars.deleteCharacter(charId)
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
