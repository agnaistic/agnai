import { v4 } from 'uuid'
import { createAppearancePrompt } from '../../common/image-prompt'
import { AppSchema } from '../../srv/db/schema'
import { EVENTS, events } from '../emitter'
import { createStore } from './create'
import { data } from './data'
import { subscribe } from './socket'
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

  events.on(EVENTS.init, (init) => {
    if (!init.characters) return
    characterStore.setState({ characters: { list: init.characters, loaded: true } })
  })

  return {
    async *getCharacters(state) {
      if (state.loading) return

      yield { loading: true }
      const res = await data.chars.getCharacters()
      yield { loading: false }

      if (res.error) {
        return toastStore.error('Failed to retrieve characters')
      }

      if (res.result) {
        return { characters: { list: res.result.characters, loaded: true } }
      }
    },
    async *createCharacter(
      { creating, characters: { list } },
      char: NewCharacter,
      onSuccess?: () => void
    ) {
      if (creating) return

      yield { creating: true }
      const res = await data.chars.createCharacter(char)
      yield { creating: false }
      if (res.error) toastStore.error(`Failed to create character: ${res.error}`)
      if (res.result) {
        toastStore.success(`Successfully created character`)
        yield { characters: { list: list.concat(res.result), loaded: true } }
        onSuccess?.()
      }
    },
    async *editCharacter(
      { characters: { list } },
      characterId: string,
      char: NewCharacter,
      onSuccess?: () => void
    ) {
      const res = await data.chars.editChracter(characterId, char)

      if (res.error) toastStore.error(`Failed to create character: ${res.error}`)
      if (res.result) {
        toastStore.success(`Successfully updated character`)
        yield {
          characters: {
            list: list.map((ch) => (ch._id === characterId ? { ...ch, ...res.result } : ch)),
            loaded: true,
          },
        }
        onSuccess?.()
      }
    },
    setFavorite: async (
      { characters: { list, loaded } },
      characterId: string,
      favorite: boolean
    ) => {
      const res = await data.chars.setFavorite(characterId, favorite)
      if (res.error) return toastStore.error(`Failed to set favorite character`)
      if (res.result) {
        return {
          characters: {
            list: list.map((ch) => (ch._id === characterId ? { ...ch, favorite } : ch)),
            loaded,
          },
        }
      }
    },
    async *editAvatar({ characters: { list } }, characterId: string, file: File) {
      const res = await data.chars.editAvatar(characterId, file)
      if (res.error) {
        toastStore.error(`Failed to update avatar: ${res.error}`)
      }

      if (res.result) {
        yield {
          characters: {
            list: list.map((ch) => (ch._id === characterId ? res.result : ch)),
            loaded: true,
          },
        }
      }
    },
    async *removeAvatar({ characters: { list } }, characterId: string) {
      const res = await data.chars.removeAvatar(characterId)
      if (res.error) {
        toastStore.error(`Failed to remove avatar: ${res.error}`)
      }

      if (res.result) {
        return {
          characters: {
            list: list.map((ch) => (ch._id === characterId ? { ...ch, avatar: '' } : ch)),
            loaded: true,
          },
        }
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
    async *generateAvatar(
      _,
      input: AppSchema.Character | AppSchema.Chat,
      onDone: (image: string) => void
    ) {
      const prompt = createAppearancePrompt(input)
      const id = v4()
      imageCallbacks[id] = onDone

      const res = await data.image.generateImage({ chatId: id, prompt, ephemeral: true, onDone })
      if (res.error) {
        delete imageCallbacks[id]
      }
    },
  }
})

const imageCallbacks: Record<string, (image: string) => void> = {}

subscribe('image-generated', { chatId: 'string', image: 'string' }, (body) => {
  imageCallbacks[body.chatId]?.(body.image)
  delete imageCallbacks[body.chatId]
})

subscribe('image-failed', { chatId: 'string', error: 'string' }, (body) => {
  delete imageCallbacks[body.chatId]

  toastStore.error(`Failed to generate avatar: ${body.error}`)
})
