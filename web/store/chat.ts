import { createPromptParts, Prompt, resolveScenario } from '../../common/prompt'
import { getEncoder } from '../../common/tokenize'
import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import type { ChatModal } from '../pages/Chat/ChatOptions'
import { clearDraft } from '../shared/hooks'
import { storage, toMap } from '../shared/util'
import { api } from './api'
import { createStore, getStore } from './create'
import { AllChat as ChatData, chatsApi } from './data/chats'
import { getPromptEntities } from './data/common'
import { imageApi } from './data/image'
import { usersApi } from './data/user'
import { embedApi } from './embeddings'
import { msgStore } from './message'
import { subscribe } from './socket'
import { toastStore } from './toasts'
import { inline, replace } from '/common/util'

export type AllChat = ChatData

export type ChatState = {
  lastChatId: string | null
  lastFetched: number
  allLoading: boolean
  allLoaded: boolean

  detailLoaded: boolean
  detailLoading: boolean

  // loaded: boolean
  // All user chats a user owns or is a member of
  allChats: AllChat[]
  allChars: { map: Record<string, AppSchema.Character>; list: AppSchema.Character[] }
  // All chats for a particular character
  char?: {
    chats: AppSchema.Chat[]
    char: AppSchema.Character
    // Active or more recent chat
  }
  active?: {
    chat: AppSchema.Chat
    char: AppSchema.Character
    replyAs?: string
    participantIds: string[]
  }
  chatProfiles: AppSchema.Profile[]
  // chatBots: AppSchema.Character[]
  // chatBotMap: Record<string, AppSchema.Character>
  memberIds: { [userId: string]: AppSchema.Profile }
  prompt?: Prompt & { msg: AppSchema.ChatMessage }
  opts: {
    modal?: ChatModal
    editing: boolean
    screenshot: boolean
    hideOoc: boolean
    pane?: ChatRightPane
    confirm: boolean
    options: 'mobile' | 'main' | false
  }
  promptHistory: Record<string, any>

  msgVisibility?: {
    id: string
  }
}

export type ChatRightPane =
  | 'character'
  | 'preset'
  | 'participants'
  | 'ui'
  | 'chat-settings'
  | 'memory'
  | 'other'

export type ImportChat = {
  name: string
  greeting: string
  scenario: string
  sampleChat: string
  messages: Array<{ msg: string; characterId?: string; userId?: string }>
  useOverrides?: boolean
}

export type NewChat = {
  name: string
  greeting?: string
  scenario?: string
  scenarioIds?: string[]
  sampleChat?: string
  overrides?: AppSchema.Chat['overrides']
  useOverrides: boolean
  mode?: AppSchema.Chat['mode']
  genPreset?: string
}

const initState: ChatState = {
  lastFetched: 0,
  lastChatId: null,

  detailLoaded: false,
  detailLoading: false,

  allLoaded: false,
  allLoading: false,
  allChats: [],
  allChars: { map: {}, list: [] },
  char: undefined,
  active: undefined,

  /** All profiles that have ever participated in the active chat */
  chatProfiles: [],

  /** All characters currently in the chat */
  // chatBots: [],
  // chatBotMap: {},

  /** Map of all profiles that have ever participated in the chat */
  memberIds: {},
  opts: {
    options: false,
    confirm: false,
    editing: false,
    screenshot: false,
    hideOoc: false,
    modal: undefined,
    pane: undefined,
  },
  promptHistory: {},
}

const EDITING_KEY = 'chat-detail-settings'

export const chatStore = createStore<ChatState>('chat', {
  lastFetched: 0,
  lastChatId: storage.localGetItem('lastChatId'),
  allLoading: false,
  allLoaded: false,
  detailLoaded: false,
  detailLoading: false,
  allChats: [],
  allChars: { map: {}, list: [] },
  chatProfiles: [],
  memberIds: {},
  opts: {
    ...getOptsCache(),
    options: false,
    confirm: false,
    modal: undefined,
    screenshot: false,
    pane: undefined,
  },
  promptHistory: {},
})((get, set) => {
  events.on(EVENTS.loggedOut, () => {
    const { opts } = get()
    chatStore.setState({
      ...initState,
      opts: { ...opts, editing: opts.editing, hideOoc: opts.hideOoc },
    })
  })

  events.on(EVENTS.init, (init) => {
    chatStore.setState({
      allChats: init.allChats || [],
      allChars: init.allChars || { map: {}, list: [] },
      allLoaded: !!init.allChats && !!init.allChars,
      lastFetched: 0,
      lastChatId: null,
    })

    if (init.chats) {
      chatStore.getAllChats()
    } else {
      chatStore.getAllChats()
    }
  })

  events.on(EVENTS.loggedIn, () => {})

  events.on(EVENTS.charUpdated, (char: AppSchema.Character, action: 'created' | 'updated') => {
    const { active, allChars } = get()

    const isCreated = allChars.list.every((ch) => ch._id !== char._id)
    const list = isCreated
      ? allChars.list.concat(char)
      : allChars.list.map((ch) => (ch._id === char._id ? char : ch))

    const map = Object.assign({}, allChars.map, { [char._id]: char })
    if (active?.char?._id !== char._id) {
      set({ allChars: { list, map } })
      return
    }

    set({ active: { ...active, char }, allChars: { list, map } })
  })

  events.on(EVENTS.charDeleted, (id: string) => {
    const { allChars } = get()
    const list = allChars.list.filter((ch) => ch._id !== id)
    const map = Object.assign({}, allChars.map, { [id]: undefined })

    set({ allChars: { list, map } })
  })

  return {
    /**
     * If a user accepts an invite to a chat, their profile has not been fetched and cached
     * To fix this, we'll lazy load them when they send a message and their profile isn't already present
     */
    option(prev: ChatState, opts: Partial<ChatState['opts']>) {
      const next = { ...prev.opts, ...opts }
      saveOptsCache(next)
      return { opts: next }
    },
    async getMemberProfile({ memberIds, lastChatId }, chatId: string, id: string) {
      // Only retrieve profiles if the chat is _active_ to avoid unnecessary profile retrieval
      if (!lastChatId || chatId !== lastChatId) return
      if (memberIds[id]) return

      const res = await usersApi.getProfile(id)
      if (res.result) {
        return {
          memberIds: { ...memberIds, [id]: res.result! },
        }
      }
    },
    *setChat({ active, allChats }, chatId: string, update: Partial<AppSchema.Chat>) {
      yield { allChats: replace(chatId, allChats, update) }

      if (active?.chat._id !== chatId) return

      return {
        active: {
          ...active,
          chat: active?.chat._id === chatId ? Object.assign({}, active.chat, update) : active?.chat,
        },
      }
    },
    async *openChat(
      _,
      id: string,
      opts?: {
        clear?: boolean
        onDone?: (success: boolean, chat: AppSchema.Chat | undefined) => void
      }
    ) {
      const clear = opts?.clear ?? true
      if (clear) {
        yield { detailLoaded: false, active: undefined }
      }

      yield { lastChatId: id, detailLoading: true }

      events.emit(EVENTS.clearMsgs, id)
      const res = await chatsApi.getChat(id)
      yield { detailLoading: false }

      /**
       * We need to check the chat id changed while we were loading this chat.
       * If it changed, we need to abandon this payload
       */
      const currentId = get().lastChatId
      if (currentId !== id) {
        console.log(`[chat-state] abandoned chat id ${inline({ was: id, now: currentId })}`)
        return
      }

      if (res.error) {
        toastStore.error(`Failed to retrieve conversation: ${res.error}`)
        opts?.onDone?.(false, undefined)
        yield { detailLoaded: true }
      }

      if (res.result) {
        // pipelineApi.chatEmbed(res.result.chat, res.result.messages)

        opts?.onDone?.(!!res.result, res.result.chat)
        storage.localSetItem('lastChatId', id)

        events.emit(EVENTS.receiveMsgs, {
          chatId: id,
          leafId: res.result.chat.treeLeafId,
          characterId: res.result.character._id,
          messages: res.result.messages,
        })

        const tempCount = Object.keys(res.result.chat.tempCharacters || {}).length
        const charCount = Object.keys(res.result.chat.characters || {}).length

        const isMultiChars = charCount > 0 || tempCount > 0

        events.emit(
          EVENTS.charsReceived,
          id,
          res.result.characters,
          Object.values(res.result.chat.tempCharacters || {})
        )

        const background = await storage.getItem(`chat-background-${id}`)
        const localSettings = await storage
          .getItem(`chat-settings-${id}`)
          .then((curr) => JSON.parse(curr || '{}'))

        if (background) {
          res.result.chat.background = background
        }

        res.result.chat.localSettings = localSettings

        yield {
          lastChatId: id,
          active: {
            chat: res.result.chat,
            char: res.result.character,
            participantIds: res.result.active,
            replyAs: isMultiChars ? undefined : res.result.character._id,
          },
          chatProfiles: res.result.members,
          memberIds: res.result.members.reduce(toMemberKeys, {}),
          detailLoaded: true,
        }
      }
    },
    setAutoReplyAs({ active }, charId: string | undefined) {
      if (!active) return
      return {
        active: { ...active, replyAs: charId },
      }
    },
    async *updateChatScenarioStates({ active }, chatId: string, states: string[]) {
      if (!active || active.chat._id !== chatId) return
      yield {
        active: {
          ...active,
          chat: { ...active.chat, scenarioStates: states },
        },
      }
      const res = await chatsApi.editChat(chatId, {
        scenarioStates: states,
        useOverrides: undefined,
      })
      if (res.error) {
        toastStore.error(`Failed to update chat states: ${res.error}`)
        return
      }
    },

    async *removeChatBackground({ active }) {
      if (!active) return

      await storage.removeItem(`chat-background-${active.chat._id}`)

      yield {
        active: {
          ...active,
          chat: { ...active.chat, background: undefined },
        },
      }
    },

    toggleMsgVisibility(_, messageId?: string) {
      return { msgVisibility: messageId ? { id: messageId } : undefined }
    },

    async *editChatBackground({ active }, image: File) {
      if (!active) return
      const base64 = await imageApi.getImageData(image)

      if (!base64) return
      await storage.setItem(`chat-background-${active.chat._id}`, base64)

      yield {
        active: {
          ...active,
          chat: { ...active.chat, background: base64 },
        },
      }
    },

    async *editLocalChatSettings({ active }, settings: any) {
      if (!active) return

      const id = `chat-settings-${active.chat._id}`
      const current = await storage.getItem(id).then((curr) => JSON.parse(curr || '{}'))

      const next = { ...current, ...settings }
      await storage.setItem(id, JSON.stringify(next))

      return { active: { ...active, chat: { ...active.chat, localSettings: next } } }
    },

    async *editChat(
      { char, allChats, active },
      id: string,
      update: Partial<AppSchema.Chat>,
      opts?: { useOverrides?: boolean; quiet?: boolean; onSuccess?: () => void }
    ) {
      const res = await chatsApi.editChat(id, { ...update, useOverrides: opts?.useOverrides })
      if (res.error) {
        toastStore.error(`Failed to update chat: ${res.error}`)
        return
      }

      if (res.result) {
        res.result.background = active?.chat.background
        res.result.localSettings = active?.chat.localSettings

        opts?.onSuccess?.()

        if (!opts?.quiet) {
          toastStore.success('Updated chat settings')
        }

        yield { allChats: allChats.map((ch) => (ch._id === id ? res.result! : ch)) }

        if (char) {
          yield {
            char: {
              char: char.char,
              chats: char.chats.map((ch) => (ch._id === id ? res.result! : ch)),
            },
          }
        }

        if (active && active.chat._id === id) {
          yield {
            active: {
              ...active,
              chat: res.result!,
              char: active.char,
              participantIds: active.participantIds,
            },
          }
        }
      }
    },

    async *assignChatPreset({ active }, chatId: string, preset: string, onSuccess?: () => void) {
      if (!preset) {
        console.error(`Tried to assign undefined preset to chat`)
        return
      }

      const res = await chatsApi.assignChatPreset(chatId, preset)
      if (res.error) toastStore.error(`Failed to update generation settings: ${res.error}`)
      if (res.result) {
        chatStore.setChat(chatId, { genSettings: undefined, genPreset: preset })
        onSuccess?.()
      }
    },
    async *getAllChats({ allChats, lastFetched }) {
      yield { allLoading: true }
      const diff = Date.now() - lastFetched
      if (diff < 300000) {
        yield { allLoading: false }
        return
      }

      const res = await chatsApi.getAllChats()
      yield { lastFetched: Date.now(), allLoaded: true, allLoading: false }
      if (res.error) {
        toastStore.error(`Could not retrieve chats: ${res.error}`)
        return { allChats }
      }

      if (res.result) {
        const chars = res.result.characters.map((c) => ({ __type: 'list_character', ...c }))
        events.emit(EVENTS.allChars, chars)
        const allChars = {
          map: toMap(chars),
          list: chars,
        }

        const nextAllChats = res.result.chats.sort(sortDesc)
        yield {
          allChats: nextAllChats,
          allChars,
          allLoaded: true,
          allLoading: false,
        }

        await storage.userCacheSet('all-chats', nextAllChats)
        await storage.userCacheSet('all-chars', allChars)
      }
    },
    async *getAllCharacters({ allChars, lastFetched }, force?: boolean) {
      yield { allLoading: true }
      const diff = Date.now() - lastFetched

      if (!force && diff < 30000) {
        yield { allLoading: false }
        return
      }

      const res = await chatsApi.getAllChats(true)
      yield { lastFetched: Date.now(), allLoading: false }

      if (res.result) {
        const chars = res.result.characters.map((c) => ({ __type: 'list_character', ...c }))
        events.emit(EVENTS.allChars, chars)
        const allChars = {
          map: toMap(chars),
          list: chars,
        }

        yield {
          allChars,
          allLoading: false,
        }
        await storage.userCacheSet('all-chars', allChars)
      }
    },

    async *createChat(
      { allChats, char },
      characterId: string,
      props: NewChat,
      onSuccess?: (id: string) => void
    ) {
      const res = await chatsApi.createChat(characterId, props)
      if (res.error) toastStore.error(`Failed to create conversation: ${res.error}`)
      if (res.result) {
        yield { allChats: [res.result, ...allChats] }

        if (char?.char._id === characterId) {
          yield { char: { ...char, chats: [res.result, ...char.chats] } }
        }

        onSuccess?.(res.result._id)
      }
    },

    async *quickCreateChat(
      { allChats, char },
      characterId: string,
      presetId: string,
      onDone: (newChatId: string) => void
    ) {
      const res = await chatsApi.createChat(characterId, {
        name: new Date().toLocaleString(),
        useOverrides: false,
        genPreset: presetId,
      })
      if (res.error) toastStore.error(`Failed to create conversation: ${res.error}`)
      if (res.result) {
        yield { allChats: [res.result, ...allChats] }

        if (char?.char._id === characterId) {
          yield { char: { ...char, chats: [res.result, ...char.chats] } }
        }

        onDone(res.result._id)
      }
    },

    async inviteUser(_, chatId: string, userId: string, onSuccess?: () => void) {
      const res = await api.post(`/chat/${chatId}/invite`, { userId })
      if (res.error) return toastStore.error(`Failed to invite user: ${res.error}`)
      if (res.result) {
        toastStore.success(`Invitation sent`)
        onSuccess?.()
      }
    },

    async uninviteUser(_, chatId: string, memberId: string, onSuccess?: () => void) {
      const res = await api.post(`/chat/${chatId}/uninvite`, { userId: memberId })
      if (res.error) return toastStore.error(`Failed to remove user: ${res.error}`)
      if (res.result) {
        toastStore.success(`Member removed from chat`)
        onSuccess?.()
      }
    },

    async *addCharacter(_, chatId: string, charId: string, onSuccess?: () => void) {
      const res = await chatsApi.addCharacter(chatId, charId)
      if (res.error) return toastStore.error(`Failed to invite character: ${res.error}`)
      if (res.result) {
        toastStore.success(`Character added`)
        onSuccess?.()
      }
    },

    async *upsertTempCharacter(
      { active, allChats },
      chatId: string,
      char: Omit<AppSchema.Character, '_id' | 'kind' | 'createdAt' | 'updatedAt' | 'userId'> & {
        _id?: string
      },
      onSuccess?: (char: AppSchema.Character) => void
    ) {
      const res = await chatsApi.upsertTempCharacter(chatId, char)
      if (res.result) {
        const char = res.result.char

        onSuccess?.(char)
        if (active?.chat._id === chatId) {
          yield {
            active: {
              ...active,
              chat: Object.assign({}, replaceTemp(active.chat, char)),
            },
          }
        }

        const nextChats = allChats.map((chat) =>
          chat._id === chatId ? Object.assign({}, replaceTemp(chat, char)) : chat
        )
        yield { allChats: nextChats }
      }

      if (res.error) {
        toastStore.error(`Failed to create temp character: ${res.error}`)
      }
    },

    async *removeCharacter(_, chatId: string, charId: string, onSuccess?: () => void) {
      const res = await chatsApi.removeCharacter(chatId, charId)
      if (res.error) return toastStore.error(`Failed to remove character: ${res.error}`)

      if (res.result) {
        toastStore.success(`Character removed from chat`)
        onSuccess?.()
      }
    },

    async *deleteChat({ active, allChats, char }, chatId: string, onSuccess?: Function) {
      clearDraft(chatId)
      const res = await chatsApi.deleteChat(chatId)
      if (res.error) return toastStore.error(`Failed to delete chat: ${res.error}`)
      if (res.result) {
        embedApi.deleteChatCache(chatId)
        toastStore.success('Successfully deleted chat')
        if (active?.chat._id === chatId) {
          yield { active: undefined }
        }

        yield { allChats: allChats.filter((ch) => ch._id !== chatId) }

        if (char?.chats) {
          yield { char: { ...char, chats: char.chats.filter((ch) => ch._id !== chatId) } }
        }

        onSuccess?.()
      }
    },

    async restartChat(_, chatId: string) {
      const res = await chatsApi.restartChat(chatId)
      if (res.result) {
        chatStore.openChat(chatId, { clear: false })
      }

      if (res.error) {
        toastStore.error(`Could not reset chat: ${res.error}`)
      }
    },

    async *importChat(
      { allChats, char, allChars },
      characterId: string,
      imported: ImportChat,
      onSuccess?: (chat: AppSchema.Chat) => void
    ) {
      const res = await chatsApi.importChat(characterId, imported, allChars)
      if (res.error) toastStore.error(`Failed to import chat: ${res.error}`)
      if (res.result) {
        yield { allChats: [res.result, ...allChats] }

        if (char?.char._id === characterId) {
          yield { char: { ...char, chats: [res.result, ...char.chats] } }
        }

        onSuccess?.(res.result)
      }
    },

    async getChatSummary(_, chatId: string) {
      await api.get(`/chat/${chatId}/summary`)
    },

    async computePrompt({ active }, msg: AppSchema.ChatMessage, perspective?: AppSchema.Character) {
      if (!active) return

      const { msgs, messageHistory } = msgStore.getState()
      const entities = await getPromptEntities()

      const encoder = await getEncoder()
      const replyAs = active.replyAs?.startsWith('temp-')
        ? entities.chat.tempCharacters![active.replyAs]
        : entities.characters[active.replyAs!] || active.char

      const resolvedScenario = resolveScenario(
        entities.chat,
        entities.char,
        entities.scenarios || []
      )

      const prompt = await createPromptParts(
        {
          ...entities,
          impersonate: entities.impersonating,
          modelFormat: entities.settings.modelFormat,
          lastMessage: entities.lastMessage?.date || '',
          replyAs: perspective || replyAs,
          sender: entities.profile,
          messages: messageHistory.concat(msgs).filter((m) => m.createdAt < msg.createdAt),
          chatEmbeds: [],
          userEmbeds: [],
          resolvedScenario,
          jsonValues: msgs.reduce((prev, curr) => Object.assign(prev, curr.json?.values || {}), {}),
        },
        encoder
      )

      // const parsed = entities.settings.modelFormat
      //   ? replaceTags(prompt.template.parsed, entities.settings.modelFormat)
      //   : prompt.template.parsed
      // prompt.template.parsed = parsed

      return { prompt: { ...prompt, msg: { ...msg }, shown: true } }
    },

    closePrompt() {
      return { prompt: undefined }
    },
  }
})

// function updateAutoReplyAs() {

// }

function toMemberKeys(prev: Record<string, AppSchema.Profile>, curr: AppSchema.Profile) {
  prev[curr.userId] = curr
  return prev
}

subscribe('profile-handle-changed', { userId: 'string', handle: 'string' }, (body) => {
  const { chatProfiles, memberIds } = chatStore.getState()
  if (!memberIds[body.userId]) return

  const nextMembers = chatProfiles.map((am) =>
    am.userId === body.userId ? { ...am, handle: body.handle } : am
  )

  const next = { ...memberIds[body.userId], handle: body.handle }

  memberIds[body.userId] = { ...memberIds[body.userId], handle: body.handle }

  chatStore.setState({
    chatProfiles: nextMembers,
    memberIds: { ...memberIds, [body.userId]: next },
  })
})

subscribe('chat-deleted', { chatId: 'string' }, (body) => {
  const { allChats, active, char } = chatStore.getState()
  if (active?.chat._id === body.chatId) {
    chatStore.setState({ active: undefined })
  }

  {
    const next = allChats.filter((ch) => ch._id !== body.chatId)
    chatStore.setState({ allChats: next })
  }

  if (char?.chats) {
    const next = char.chats.filter((ch) => ch._id !== body.chatId)
    chatStore.setState({ char: { ...char, chats: next } })
  }
})

function sortDesc(left: { updatedAt: string }, right: { updatedAt: string }): number {
  return left.updatedAt > right.updatedAt ? -1 : left.updatedAt === right.updatedAt ? 0 : 1
}

subscribe('member-removed', { memberId: 'string', chatId: 'string' }, (body) => {
  const profile = getStore('user').getState().profile
  if (!profile) return

  const { chatProfiles, active } = chatStore.getState()

  if (!active?.chat) return
  if (active.chat._id !== body.chatId) return

  const nextIds = active.participantIds.filter((id) => id !== body.memberId)
  const nextProfiles = chatProfiles.filter((mem) => mem.userId !== body.memberId)
  chatStore.setState({ chatProfiles: nextProfiles, active: { ...active, participantIds: nextIds } })
})

subscribe(
  'member-added',
  {
    chatId: 'string',
    profile: { kind: 'any', userId: 'string', handle: 'string', _id: 'string', avatar: 'string?' },
  },
  (body) => {
    const { active, chatProfiles, memberIds } = chatStore.getState()
    if (!active || active.chat._id !== body.chatId) return

    const nextProfiles = chatProfiles.concat(body.profile)
    const nextProfileMap = { ...memberIds, [body.profile.userId]: body.profile }
    const nextIds = active.participantIds.concat(body.profile.userId)
    const nextChat = {
      ...active.chat,
      memberIds: active.chat.memberIds.concat(body.profile.userId),
    }
    chatStore.setState({
      chatProfiles: nextProfiles,
      memberIds: nextProfileMap,
      active: { ...active, participantIds: nextIds, chat: nextChat },
    })
  }
)

type ChatOptCache = { editing: boolean; hideOoc: boolean }

export function quickCreateChat(characterId: string, nav: (to: string) => void) {
  const user = getStore('user').getState().user

  const presets = getStore('presets').getState().presets
  const preset = user?.defaultPreset ? presets.find((p) => user.defaultPreset) : undefined

  if (!preset) {
    nav(`/chats/create/${characterId || ''}`)
    return
  }

  chatStore.quickCreateChat(characterId, preset._id, (id) => nav(`/chat/${id}`))
}

function saveOptsCache(cache: ChatOptCache) {
  const prev = getOptsCache()
  storage.localSetItem(EDITING_KEY, JSON.stringify({ ...prev, ...cache }))
}

function getOptsCache(): ChatOptCache {
  const prev =
    storage.localGetItem(EDITING_KEY) || JSON.stringify({ editing: false, hideOoc: false })
  const body = JSON.parse(prev)
  return { editing: false, hideOoc: false, ...body, modal: undefined }
}

subscribe('chat-server-notification', { chatId: 'string', text: 'string' }, (body) => {
  const { active } = chatStore.getState()
  if (body.chatId !== active?.chat._id) return
  toastStore.warn(body.text)
})

subscribe(
  'chat-character-added',
  { chatId: 'string', active: 'boolean?', character: 'any' },
  (body) => {
    const { active, allChats } = chatStore.getState()

    const nextChats = allChats.map((chat) => {
      if (chat._id !== body.chatId) return chat
      return {
        ...chat,
        characters: Object.assign({}, chat.characters, { [body.character._id]: true }),
      }
    })

    chatStore.setState({ allChats: nextChats })

    if (!active || active.chat._id !== body.chatId) return

    const nextActive = {
      ...(active.chat.characters || {}),
      [body.character._id]: body.active ?? true,
    }

    chatStore.setState({
      active: {
        ...active,
        chat: {
          ...active.chat,
          characters: nextActive,
        },
      },
    })

    events.emit(EVENTS.charAdded, body.character)
  }
)

subscribe('chat-character-removed', { chatId: 'string', characterId: 'string' }, (body) => {
  const { active, allChats } = chatStore.getState()

  const nextChats = allChats.map((c) => {
    if (c._id !== body.chatId) return c
    return {
      ...c,
      characters: { ...(c.characters || {}), [body.characterId]: false },
    }
  })
  chatStore.setState({ allChats: nextChats })

  if (!active || active.chat._id !== body.chatId) return

  const nextChatCharacters = { ...(active.chat.characters || {}), [body.characterId]: false }
  chatStore.setState({
    active: {
      ...active,
      chat: {
        ...active.chat,
        characters: nextChatCharacters,
      },
    },
  })
})

subscribe('service-prompt', { id: 'string', prompt: 'any' }, (body) => {
  const { promptHistory } = chatStore.getState()

  chatStore.setState({
    promptHistory: Object.assign({}, promptHistory, {
      [body.id]: body.prompt,
      partial: body.prompt,
    }),
  })
})

subscribe('chat-temp-character', { chatId: 'string', character: 'any' }, (body) => {
  const { active, allChats } = chatStore.getState()
  const nextChats = allChats.map((chat) => {
    if (chat._id !== body.chatId) return chat
    return replaceTemp(chat, body.character)
  })

  chatStore.setState({ allChats: nextChats })

  if (!active || active.chat._id !== body.chatId) return

  chatStore.setState({
    active: {
      ...active,
      chat: replaceTemp(active.chat, body.character),
    },
  })
})

function replaceTemp(chat: AppSchema.Chat, char: AppSchema.Character): AppSchema.Chat {
  const temp = chat.tempCharacters || {}
  temp[char._id] = char

  return {
    ...chat,
    tempCharacters: { ...temp },
  }
}
