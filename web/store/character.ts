import { createAppearancePrompt } from '../../common/image-prompt'
import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { createStore, getStore } from './create'
import { subscribe } from './socket'
import { toastStore } from './toasts'
import { charsApi } from './data/chars'
import { ImageResult, imageApi } from './data/image'
import { getAssetUrl, storage, toMap } from '../shared/util'
import { charToJson, createCharacterImageBlob, toCharacterMap } from '../pages/Character/util'
import { getUserId } from './api'
import { getStoredValue, setStoredValue } from '../shared/hooks'
import { HordeCheck } from '/common/horde-gen'
import { v4 } from 'uuid'
import { combine, findOne, updateList } from '/common/util'
import { debug } from '/common/debug'
import JSZip from 'jszip'
import { chatsApi } from './data/chats'

const log = debug('bot-store')

const IMPERSONATE_KEY = 'agnai-impersonate'

type CharacterState = {
  loading?: boolean
  hordeStatus?: HordeCheck
  defaultImpersonateId: string
  impersonating?: AppSchema.Character
  characters: {
    loaded: number
    list: AppSchema.Character[]
    map: Record<string, AppSchema.Character>
  }
  editing?: AppSchema.Character
  activeChatId: string
  chatChars: {
    chatId: string
    list: AppSchema.Character[]
    map: Record<string, AppSchema.Character>
  }
  creating: boolean
  generate: {
    requestId: string | null
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
  activeChatId: '',
  characters: { loaded: 0, list: [], map: {} },
  chatChars: { chatId: '', list: [], map: {} },
  generate: {
    requestId: null,
    image: null,
    blob: null,
    loading: false,
  },
  defaultImpersonateId: storage.localGetItem(IMPERSONATE_KEY) || '',
  impersonating: undefined,
}

export const characterStore = createStore<CharacterState>(
  'character',
  initState
)((get, set) => {
  events.on(EVENTS.init, (data) => {
    const allChars = Array.isArray(data.allChars)
      ? data.allChars
      : Array.isArray(data.allChars?.list)
      ? data.allChars.list
      : null

    log('receiving #%s', allChars?.length)
    if (!allChars) return

    replaceCharacters(allChars)

    /**
     * The chat list relies on the characters being available
     * We handle the chat-init here to prevent any race conditions
     */
    getStore('chat').setState({
      allChats: data.allChats || [],
      lastFetched: 0,
      lastChatId: null,
    })
  })

  return {
    clearCharacter() {
      return { editing: undefined }
    },
    async *getCharacter(
      { characters },
      characterId: string,
      opts?: {
        chat?: AppSchema.Chat
        cb?: (char: AppSchema.Character) => void
        onDone?: (success: boolean, char?: AppSchema.Character) => void
      }
    ) {
      if (opts?.chat?.tempCharacters && characterId.startsWith('temp-')) {
        const char = opts.chat.tempCharacters[characterId]
        if (!char) {
          opts.onDone?.(false)
          return toastStore.error(`Temp character not found`)
        }

        opts.cb?.(char)
        opts.onDone?.(true, char)
        yield { editing: char }
        return
      }

      const previous = characters.list.find((c) => c._id === characterId)
      yield { editing: previous }

      const res = await charsApi.getCharacterDetail(characterId)
      if (res.result) {
        yield { editing: res.result }
        opts?.onDone?.(true, res.result)
        opts?.cb?.(res.result)
      }

      if (res.error) {
        opts?.onDone?.(false)
        return toastStore.error(res.error)
      }
    },

    async *getAllChats({ loading, characters }, force?: boolean) {
      if (loading) return

      const age = Date.now() - characters.loaded
      if (!force && age < 30000) return

      const res = await chatsApi.getAllChats()
      if (res.error || !res.result) {
        toastStore.error(`Could not retrieve chats: ${res.error}`)
        return
      }

      const chars = res.result.characters.map((c) => ({ __type: 'list_character', ...c }))
      replaceCharacters(chars)
      events.emit(EVENTS.allChats, res.result.chats)
    },

    async *getCharacters(state, force?: boolean) {
      if (!force && state.loading) return

      const age = Date.now() - state.characters.loaded
      if (!force && age < 30000) return

      yield { loading: true }

      const res = await chatsApi.getAllChats(true)

      if (res.result) {
        const chars = res.result.characters.map((c) => ({ __type: 'list_character', ...c }))
        replaceCharacters(chars)
      }

      yield { loading: false }
    },

    defaultImpersonate: (_, charId: string) => {
      storage.localSetItem(IMPERSONATE_KEY, charId || '')
      return { defaultImpersonateId: charId || '' }
    },

    async *impersonate({ activeChatId, chatChars }, char?: AppSchema.Character) {
      if (activeChatId) {
        setStoredValue(`${activeChatId}-impersonate`, char?._id || '')
      }

      if (!char) {
        return { impersonating: undefined }
      }

      const detail = char.persona ? char : chatChars.map[char._id]
      if (detail) {
        log('impersonate success')
        return { impersonating: detail }
      }

      // Quickly load the shallow result and silently load the character detail
      yield { impersonating: char }

      const remote = await getCharacterDetail(char._id)
      if (remote) {
        log('impersonate loaded')
        return { impersonating: remote }
      }

      return { impersonating: char || undefined }
    },

    async *loadImpersonate(
      { activeChatId, chatChars: { list }, characters: { list: allList }, impersonating: current },
      chatId?: string
    ) {
      const fallback = storage.localGetItem(IMPERSONATE_KEY) || ''

      const idUsed = chatId ? 'chat-id' : activeChatId ? 'active-id' : 'none'

      let id =
        idUsed === 'none'
          ? fallback
          : getStoredValue(`${chatId || activeChatId}-impersonate`, fallback)

      if (!id) {
        yield { impersonating: undefined }
        return
      }

      const detail = findOne(id, list)
      if (detail) {
        yield { impersonating: detail }
        log('impersonate pre-loaded')
        return
      }

      const shallow = findOne(id, allList)
      if (shallow) {
        yield { impersonating: shallow }
        const detail = await getCharacterDetail(id)
        log('impersaonte loaded, detail: %s', !!detail)
        yield { impersonating: detail || shallow }
        return
      }

      yield { impersonating: undefined }
      return
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
    async *editPartialCharacter(
      { characters: { list, map, loaded }, chatChars },
      characterId: string,
      char: Partial<AppSchema.Character>,
      onSuccess?: () => void
    ) {
      const res = await charsApi.editPartialCharacter(characterId, char)

      if (res.error) toastStore.error(`Failed to update character: ${res.error}`)

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
            map: replaceChar(map, characterId, res.result),
            loaded,
          },
          chatChars: nextChars,
        }
        onSuccess?.()
      }
    },
    async *editMany(
      { characters, loading },
      ids: string[],
      action: { type: 'delete' | 'archive' | 'add-tag' | 'remove-tag' | 'folder'; value?: string }
    ) {
      if (loading) return
      yield { loading: true }

      const res = await charsApi.editMany(ids, action)
      yield { loading: false }

      if (res.error || !res.result) {
        const msg = res.error || `Unexpected error occurred`
        toastStore.error(`Failed bulk character update: ${msg}`)
        return
      }

      if (action.type === 'delete') {
        const next = removeCharacters(characters, ids)
        yield { characters: { loaded: Date.now(), list: next.list, map: next.map } }
        return
      }

      replaceCharacters(res.result.characters)
    },
    async *editFullCharacter(
      { characters: { list, map, loaded }, chatChars },
      characterId: string,
      char: UpdateCharacter,
      onSuccess?: () => void
    ) {
      const previous = map[characterId]
      const res = await charsApi.editCharacter(characterId, char, previous)

      if (res.error) toastStore.error(`Failed to update character: ${res.error}`)
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
            map: replaceChar(map, characterId, res.result),
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
        const prev = list.find((ch) => ch._id === characterId)
        if (!prev) return

        const nextChar = { ...prev }
        nextChar.favorite = favorite
        events.emit('character-updated', nextChar, 'updated')
        return {
          characters: {
            list: list.map((ch) => (ch._id === characterId ? nextChar : ch)),
            map: replaceChar(map, characterId, { favorite }),
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
            map: replaceChar(map, characterId, res.result),
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
            map: replaceChar(map, characterId, { avatar: '' }),
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
      return { generate: { requestId: null, image: null, loading: false, blob: null } }
    },
    async *generateAvatar(
      { generate: prev },
      opts: { user: AppSchema.User; persona: AppSchema.Persona | string; override?: string },
      onDone?: (err: any, image?: File) => void
    ) {
      const { persona, user, override } = opts
      const requestId = v4()
      try {
        let prompt =
          typeof persona === 'string'
            ? `${persona}`
            : await createAppearancePrompt(user, { persona })

        prompt = prompt.replace(/\n+/g, ', ').replace(/\s+/g, ' ')
        yield {
          generate: { requestId, image: null, loading: true, blob: null },
          hordeStatus: undefined,
        }
        imageCallback = onDone

        const res = await imageApi
          .generateImageAsync(prompt, {
            requestId,
            model: override,
            onTick: (status) => {
              set({ hordeStatus: status })
            },
            onDone: (result) => {
              if (result.error) {
                onDone?.(result.error)
                return
              }

              onDone?.(null, result.file)
            },
          })
          .catch((ex) => ex as ImageResult)

        if (res.image) {
          yield { generate: { requestId: null, image: res.image, loading: false, blob: res.file } }
          return
        }

        if (res.error) {
          onDone?.(res.error)
          yield {
            generate: { requestId: null, image: prev.image, loading: false, blob: prev.blob },
          }
        }
      } catch (ex: any) {
        toastStore.error(ex.message)
      }
    },
  }
})

let imageCallback: ((err: any, image?: File) => void) | undefined = undefined

characterStore.subscribe(async (state, prev) => {
  if (state.characters.list.length && state.characters.list !== prev.characters.list) {
    await storage.userCacheSet('all-chars', state.characters.list)
  }
})

subscribe(
  'image-generated',
  { image: 'string', source: 'string', requestId: 'string?' },
  async (body) => {
    if (body.source !== 'avatar') return
    const prev = characterStore.getState().generate

    if (prev.requestId && body.requestId !== prev.requestId) {
      return
    }

    const image = await fetch(getAssetUrl(body.image)).then((res) => res.blob())
    const file = new File([image], `avatar.png`, { type: 'image/png' })
    characterStore.setState({
      generate: { requestId: null, image: body.image, loading: false, blob: file },
    })

    if (imageCallback) {
      imageCallback(null, file)
      imageCallback = undefined
    }
  }
)

subscribe('image-failed', { error: 'string', requestId: 'string?' }, (body) => {
  const { generate } = characterStore.getState()
  if (!generate.loading) return
  if (generate.requestId && body.requestId !== generate.requestId) return

  characterStore.setState({
    generate: { requestId: null, image: null, loading: false, blob: null },
  })
  toastStore.error(`Failed to generate avatar: ${body.error}`)
})

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

events.on(EVENTS.loggedOut, () => {
  characterStore.setState({ ...initState })
  characterStore.getCharacters(true)
})

events.on(EVENTS.loggedIn, () => {
  characterStore.setState({ ...initState })
})

events.on(EVENTS.charAdded, (char: AppSchema.Character) => {
  const { chatChars: prev } = characterStore.getState()
  const next = combine(prev.list, [char])

  characterStore.setState({
    chatChars: {
      chatId: prev.chatId,
      list: next,
      map: Object.assign({}, prev.map, { [char._id]: char }),
    },
  })
})

events.on(
  EVENTS.charsReceived,
  async (chatId: string, chars: AppSchema.Character[], temps: AppSchema.Character[]) => {
    const prev = characterStore.getState().chatChars.list
    const allChars = combine(prev, chars.concat(temps))
    characterStore.setState({ chatChars: { chatId, list: allChars, map: toMap(allChars) } })
    characterStore.loadImpersonate(chatId)
  }
)

events.on(EVENTS.chatOpened, (chatId: string) => {
  characterStore.setState({ activeChatId: chatId })
})

events.on(EVENTS.chatClosed, () => {
  characterStore.setState({ activeChatId: '' })
  characterStore.loadImpersonate()
})

events.on(EVENTS.allChars, async (chars: AppSchema.Character[]) => {
  const state = characterStore.getState()
  const userId = getUserId()

  characterStore.setState({
    characters: {
      map: toMap(chars),
      list: chars.filter((ch) => ch.userId === userId),
      loaded: Date.now(),
    },
  })

  if (state.impersonating) return

  characterStore.loadImpersonate()
})

function replaceChar(
  map: Record<string, AppSchema.Character>,
  id: string,
  char: Partial<AppSchema.Character>
): Record<string, AppSchema.Character> {
  const next = map[id] || {}
  return { ...map, [id]: { ...next, ...char } }
}

function replaceCharacters(incoming: AppSchema.Character[]) {
  log('received list')
  const { characters: prevList, chatChars: prevChat } = characterStore.getState()
  const nextList = reconcileCharacters(prevList, incoming, { concat: true, owned: true })
  const nextChat = reconcileCharacters(prevChat, incoming, { concat: false, owned: false })

  characterStore.setState({
    characters: { loaded: Date.now(), ...nextList },
    chatChars: { chatId: prevChat.chatId, ...nextChat },
  })
}

function reconcileCharacters(
  previous: { list: AppSchema.Character[]; map: Record<string, AppSchema.Character> },
  incoming: AppSchema.Character[],
  opts: {
    /** If character is absent from the list/map, add it  */
    concat: boolean

    /** Omit characters not owned by this user */
    owned: boolean
  }
) {
  const userId = getUserId()
  const nextMap: Record<string, AppSchema.Character> = { ...previous.map }
  const nextList = opts.concat
    ? combine(previous.list, incoming)
    : updateList(previous.list, incoming)

  for (const char of incoming) {
    // Exclude unowned characters if specified
    // Typically used for the 'all character' list
    if (opts.owned && char.userId !== userId) continue

    const prev = previous.map[char._id]
    if (!opts.concat && !prev) continue

    nextMap[char._id] = { ...prev, ...char }
  }

  return { list: nextList, map: nextMap }
}

function removeCharacters(
  previous: { list: AppSchema.Character[]; map: Record<string, AppSchema.Character> },
  characterIds: string[]
) {
  const ids = new Set(characterIds)
  const nextList = previous.list.filter((ch) => !ids.has(ch._id))
  const nextMap: Record<string, AppSchema.Character> = {}

  for (const [id, char] of Object.entries(previous.map)) {
    if (ids.has(id)) continue
    nextMap[id] = { ...char }
  }

  return { list: nextList, map: nextMap }
}

subscribe('horde-status', { status: 'any' }, (body) => {
  characterStore.setState({ hordeStatus: body.status })
})

async function getCharacterDetail(characterId: string) {
  const char = await charsApi.getCharacterDetail(characterId)

  if (!char.result) return

  const detail = characterStore.getState().characters
  const nextList = combine(detail.list, [char.result])

  const nextMap = replaceChar(detail.map, characterId, char.result)

  characterStore.setState({ characters: { list: nextList, map: nextMap, loaded: detail.loaded } })
  return char.result
}

export async function downloadCharacters(characterIds: string[]) {
  const characters = await getMultipleCharacters(characterIds)

  const zip = new JSZip()

  for (const char of characters) {
    const ext = char.avatar ? 'png' : 'json'
    const name = `${char.name}.${char._id.slice(0, 4)}.${ext}`
    const data = char.avatar
      ? await createCharacterImageBlob(char, 'native')
      : charToJson(char, 'native')
    zip.file(name, data)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob)
  anchor.download = `characters.zip`
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

async function getMultipleCharacters(characterIds: string[]) {
  const { characters, chatChars } = characterStore.getState()
  const chars: AppSchema.Character[] = []
  const missing: string[] = []

  for (const charId of characterIds) {
    const char = chatChars.map[charId] || characters.map[charId]
    if (!char?.persona) {
      missing.push(charId)
      continue
    }

    chars.push(char)
  }

  const details = await charsApi.getMultipleDetails(missing)
  if (details.error) {
    throw new Error(`Could not retrieve character details: ${details.error}`)
  }

  const loaded = chars.concat(details.result)
  replaceCharacters(loaded)

  return loaded
}
