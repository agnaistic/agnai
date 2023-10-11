import { createAppearancePrompt } from '../../common/image-prompt'
import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { createStore } from './create'
import { subscribe } from './socket'
import { toastStore } from './toasts'
import { charsApi, getImageData } from './data/chars'
import { imageApi } from './data/image'
import { getAssetUrl, storage, toMap } from '../shared/util'
import { toCharacterMap } from '../pages/Character/util'
import { getUserId } from './api'

const IMPERSONATE_KEY = 'agnai-impersonate'

type CharacterState = {
  loading?: boolean
  impersonating?: AppSchema.Character
  characters: {
    loaded: number
    list: AppSchema.Character[]
    map: Record<string, AppSchema.Character>
  }
  editing?: AppSchema.Character
  chatChars: {
    list: AppSchema.Character[]
    map: Record<string, AppSchema.Character>
  }
  creating: boolean
  generate: {
    image: any
    loading: boolean
    blob?: File | null
  }
}

export type NewCharacter = UpdateCharacter &
  Pick<
    AppSchema.Character,
    | 'name'
    | 'greeting'
    | 'scenario'
    | 'sampleChat'
    | 'persona'
    | 'alternateGreetings'
    | 'characterBook'
    | 'extensions'
    | 'systemPrompt'
    | 'postHistoryInstructions'
    | 'creator'
    | 'characterVersion'
    | 'insert'
  > & {
    originalAvatar: any
  }

export type UpdateCharacter = Partial<
  Omit<AppSchema.Character, '_id' | 'kind' | 'userId' | 'createdAt' | 'updatedAt' | 'avatar'> & {
    avatar?: File
  }
>

const initState: CharacterState = {
  loading: false,
  creating: false,
  characters: { loaded: 0, list: [], map: {} },
  chatChars: { list: [], map: {} },
  generate: {
    image: null,
    blob: null,
    loading: false,
  },
  impersonating: undefined,
}

export const characterStore = createStore<CharacterState>(
  'character',
  initState
)((get, set) => {
  events.on(EVENTS.loggedOut, () => {
    characterStore.setState({ ...initState })
    characterStore.getCharacters(true)
  })

  events.on(EVENTS.loggedIn, () => {
    characterStore.setState({ ...initState })
  })

  events.on(EVENTS.charAdded, (char: AppSchema.Character) => {
    const { chatChars: prev } = get()
    set({
      chatChars: {
        list: prev.list.concat(char),
        map: Object.assign({}, prev.map, { [char._id]: char }),
      },
    })
  })

  events.on(
    EVENTS.charsReceived,
    async (chars: AppSchema.Character[], temps: AppSchema.Character[]) => {
      const state = get()
      const id = await storage.getItem(IMPERSONATE_KEY)
      let impersonating =
        !state.impersonating && id
          ? chars.concat(temps).find((ch) => ch._id === id)
          : state.impersonating

      if (id?.startsWith('temp') && temps.every((ch) => ch._id !== id)) {
        impersonating = undefined
      }

      set({ chatChars: { list: chars, map: toMap(chars) }, impersonating })
    }
  )

  events.on(EVENTS.init, (data) => {
    if (!data.characters) return
    events.emit(EVENTS.allChars, data.characters)
  })

  events.on(EVENTS.allChars, async (chars: AppSchema.Character[]) => {
    const state = get()
    const id = await storage.getItem(IMPERSONATE_KEY)
    const userId = getUserId()

    const impersonating =
      !state.impersonating && id ? chars.find((ch) => ch._id === id) : state.impersonating

    set({
      characters: {
        map: toMap(chars),
        list: chars.filter((ch) => ch.userId === userId),
        loaded: Date.now(),
      },
      impersonating,
    })
  })

  return {
    clearCharacter() {
      return { editing: undefined }
    },
    async *getCharacter(_, characterId: string, chat?: AppSchema.Chat) {
      if (chat?.tempCharacters && characterId.startsWith('temp-')) {
        const char = chat.tempCharacters[characterId]
        if (!char) return toastStore.error(`Temp character not found`)
        return { editing: char }
      }
      yield { editing: undefined }
      const res = await charsApi.getCharacterDetail(characterId)
      if (res.result) {
        return { editing: res.result }
      }

      if (res.error) {
        return toastStore.error(res.error)
      }
    },
    async *getCharacters(state, force?: boolean) {
      if (!force && state.loading) return

      const age = Date.now() - state.characters.loaded
      if (!force && age < 30000) return

      yield { loading: true }
      const res = await charsApi.getCharacters()

      if (res.error) {
        yield { loading: false }
        return toastStore.error('Failed to retrieve characters')
      }

      if (res.result && state.impersonating) {
        return {
          characters: {
            list: res.result.characters,
            map: toMap(res.result.characters),
            loaded: Date.now(),
          },
          loading: false,
        }
      }

      if (res.result && !state.impersonating) {
        const id = await storage.getItem(IMPERSONATE_KEY)
        const impersonating = res.result.characters.find((ch: AppSchema.Character) => ch._id === id)

        return {
          characters: {
            list: res.result.characters,
            map: toMap(res.result.characters),
            loaded: Date.now(),
          },
          impersonating,
          loading: false,
        }
      }
    },

    impersonate(_, char?: AppSchema.Character) {
      storage.setItem(IMPERSONATE_KEY, char?._id || '')
      return { impersonating: char || undefined }
    },

    async *createCharacter(
      { creating, characters: { list, loaded } },
      char: NewCharacter,
      onSuccess?: (result: AppSchema.Character) => void
    ) {
      if (creating) return

      yield { creating: true }
      const res = await charsApi.createCharacter(char)
      yield { creating: false }
      if (res.error) toastStore.error(`Failed to create character: ${res.error}`)
      if (res.result) {
        toastStore.success(`Successfully created character`)
        events.emit(EVENTS.charUpdated, res.result, 'created')
        yield {
          characters: {
            list: list.concat(res.result),
            map: toCharacterMap(list.concat(res.result)),
            loaded,
          },
        }
        onSuccess?.(res.result)
      }
    },
    async *editCharacter(
      { characters: { list, map, loaded }, chatChars },
      characterId: string,
      char: UpdateCharacter,
      onSuccess?: () => void
    ) {
      const res = await charsApi.editCharacter(characterId, char)

      if (res.error) toastStore.error(`Failed to create character: ${res.error}`)
      if (res.result) {
        const next: AppSchema.Character = res.result
        events.emit(EVENTS.charUpdated, res.result, 'updated')
        toastStore.success(`Successfully updated character`)

        const isChatChar = !!chatChars.map[next._id]
        const nextChars = { ...chatChars }
        if (isChatChar) {
          nextChars.map = Object.assign({}, nextChars.map, { [next._id]: next })
          nextChars.list = nextChars.list.map((ch) => (ch._id === next._id ? next : ch))
        }

        yield {
          characters: {
            list: list.map((ch) => (ch._id === characterId ? { ...ch, ...res.result } : ch)),
            map: replace(map, characterId, res.result),
            loaded,
          },
          chatChars: nextChars,
        }
        onSuccess?.()
      }
    },
    setFavorite: async (
      { characters: { list, map, loaded } },
      characterId: string,
      favorite: boolean
    ) => {
      const res = await charsApi.setFavorite(characterId, favorite)
      if (res.error) return toastStore.error(`Failed to set favorite character`)
      if (res.result) {
        return {
          characters: {
            list: list.map((ch) => (ch._id === characterId ? { ...ch, favorite } : ch)),
            map: replace(map, characterId, { favorite }),
            loaded,
          },
        }
      }
    },
    async *editAvatar({ characters: { list, map, loaded } }, characterId: string, file: File) {
      const res = await charsApi.editAvatar(characterId, file)
      if (res.error) {
        toastStore.error(`Failed to update avatar: ${res.error}`)
      }

      if (res.result) {
        yield {
          characters: {
            list: list.map((ch) => (ch._id === characterId ? res.result : ch)),
            map: replace(map, characterId, res.result),
            loaded,
          },
        }
      }
    },
    async *removeAvatar({ characters: { list, map, loaded } }, characterId: string) {
      const res = await charsApi.removeAvatar(characterId)
      if (res.error) {
        toastStore.error(`Failed to remove avatar: ${res.error}`)
      }

      if (res.result) {
        return {
          characters: {
            list: list.map((ch) => (ch._id === characterId ? { ...ch, avatar: '' } : ch)),
            map: replace(map, characterId, { avatar: '' }),
            loaded,
          },
        }
      }
    },
    deleteCharacter: async (
      { characters: { list, map, loaded } },
      charId: string,
      onSuccess?: () => void
    ) => {
      const res = await charsApi.deleteCharacter(charId)
      if (res.error) return toastStore.error(`Failed to delete character`)
      if (res.result) {
        events.emit(EVENTS.charDeleted, charId)
        const next = list.filter((char) => char._id !== charId)
        toastStore.success('Successfully deleted character')
        onSuccess?.()
        delete map[charId]
        return {
          characters: { loaded, list: next, map },
        }
      }
    },
    clearGeneratedAvatar() {
      return { generate: { image: null, loading: false, blob: null } }
    },
    async *generateAvatar(
      { generate: prev },
      user: AppSchema.User,
      persona: AppSchema.Persona | string,
      onDone?: (err: any, image?: string) => void
    ) {
      try {
        let prompt =
          typeof persona === 'string'
            ? `full body, ${persona}`
            : await createAppearancePrompt(user, { persona })

        prompt = prompt
          .replace(/\n+/g, ', ')
          .replace(/\./g, ',')
          .replace(/,+/g, ', ')
          .replace(/\s+/g, ' ')
        yield { generate: { image: null, loading: true, blob: null } }
        const res = await imageApi.generateImageWithPrompt(prompt, 'avatar', async (image) => {
          const file = await dataURLtoFile(image)
          const data = await getImageData(file)
          onDone?.(null, data)
          set({ generate: { image: data, loading: false, blob: file } })
        })
        if (res.error) {
          onDone?.(res.error)
          yield { generate: { image: prev.image, loading: false, blob: prev.blob } }
        }
      } catch (ex: any) {
        toastStore.error(ex.message)
      }
    },
  }
})

subscribe('image-generated', { image: 'string', source: 'string' }, async (body) => {
  if (body.source !== 'avatar') return
  const image = await fetch(getAssetUrl(body.image)).then((res) => res.blob())
  const file = new File([image], `avatar.png`, { type: 'image/png' })
  characterStore.setState({ generate: { image: body.image, loading: false, blob: file } })
})

subscribe('image-failed', { error: 'string' }, (body) => {
  characterStore.setState({ generate: { image: null, loading: false, blob: null } })
  toastStore.error(`Failed to generate avatar: ${body.error}`)
})

async function dataURLtoFile(base64: string) {
  if (!base64.startsWith('data')) {
    base64 = `data:image/png;base64,${base64}`
  }

  return fetch(base64)
    .then((res) => res.blob())
    .then((buf) => new File([buf], 'avatar.png', { type: 'image/png' }))
}

subscribe(
  'chat-character-added',
  { chatId: 'string', active: 'boolean?', character: 'any' },
  (body) => {
    const { characters } = characterStore.getState()
    const char: AppSchema.Character = body.character

    const match = characters.list.find((ch) => ch._id === char._id)
    if (match) return

    characterStore.setState({
      characters: {
        list: characters.list.concat(body.character),
        map: Object.assign(characters.map, { [char._id]: char }),
        loaded: characters.loaded,
      },
    })
  }
)

function replace(
  map: Record<string, AppSchema.Character>,
  id: string,
  char: Partial<AppSchema.Character>
): Record<string, AppSchema.Character> {
  const next = map[id] || {}
  return { ...map, [id]: { ...next, ...char } }
}
