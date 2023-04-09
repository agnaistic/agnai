import { createPrompt, Prompt } from '../../common/prompt'
import { AppSchema } from '../../srv/db/schema'
import { events } from '../emitter'
import { api } from './api'
import { characterStore } from './character'
import { createStore, getStore } from './create'
import { data } from './data'
import { AllChat } from './data/chats'
import { msgStore } from './message'
import { subscribe } from './socket'
import { toastStore } from './toasts'

export { AllChat }

type ChatState = {
  lastChatId: string | null
  loaded: boolean
  // All user chats a user owns or is a member of
  all?: {
    chats: AllChat[]
    chars: { [charId: string]: AppSchema.Character }
  }
  // All chats for a particular character
  char?: {
    chats: AppSchema.Chat[]
    char: AppSchema.Character
    // Active or more recent chat
  }
  active?: {
    chat: AppSchema.Chat
    char: AppSchema.Character
    participantIds: string[]
  }
  activeMembers: AppSchema.Profile[]
  memberIds: { [userId: string]: AppSchema.Profile }
  prompt?: Prompt
}

export type ImportChat = {
  name: string
  greeting: string
  scenario: string
  sampleChat: string
  messages: Array<{ msg: string; characterId?: string; userId?: string }>
}

export type NewChat = {
  name: string
  greeting: string
  scenario: string
  sampleChat: string
  overrides: AppSchema.Chat['overrides']
}

const initState: ChatState = {
  lastChatId: null,
  loaded: false,
  all: undefined,
  char: undefined,
  active: undefined,
  activeMembers: [],
  memberIds: {},
}

export const chatStore = createStore<ChatState>('chat', {
  lastChatId: localStorage.getItem('lastChatId'),
  loaded: false,
  activeMembers: [],
  memberIds: {},
})((get, set) => {
  events.on('logged-out', () => {
    chatStore.setState(initState)
  })
  return {
    /**
     * If a user accepts an invite to a chat, their profile has not been fetched and cached
     * To fix this, we'll lazy load them when they send a message and their profile isn't already present
     */
    async getMemberProfile({ memberIds, lastChatId }, chatId: string, id: string) {
      // Only retrieve profiles if the chat is _active_ to avoid unnecessary profile retrieval
      if (!lastChatId || chatId !== lastChatId) return
      if (memberIds[id]) return

      const res = await data.user.getProfile(id)
      if (res.result) {
        return {
          memberIds: { ...memberIds, [id]: res.result },
        }
      }
    },
    async *getChat(_, id: string) {
      const res = await data.chats.getChat(id)

      if (res.error) toastStore.error(`Failed to retrieve conversation: ${res.error}`)
      if (res.result) {
        localStorage.setItem('lastChatId', id)

        msgStore.setState({ msgs: res.result.messages, activeChatId: id })

        yield {
          lastChatId: id,
          active: {
            chat: res.result.chat,
            char: res.result.character,
            participantIds: res.result.active,
          },
          activeMembers: res.result.members,
          memberIds: res.result.members.reduce(toMemberKeys, {}),
        }
      }
    },
    async *editChat(
      { char, all, active },
      id: string,
      update: Partial<AppSchema.Chat>,
      onSuccess?: () => void
    ) {
      const res = await data.chats.editChat(id, update)
      if (res.error) {
        toastStore.error(`Failed to update chat: ${res.error}`)
        return
      }

      if (res.result) {
        onSuccess?.()
        toastStore.success('Updated chat settings')

        if (all) {
          yield {
            all: {
              chars: all.chars,
              chats: all.chats.map((ch) => (ch._id === id ? res.result! : ch)),
            },
          }
        }

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
            active: { chat: res.result!, char: active.char, participantIds: active.participantIds },
          }
        }
      }
    },
    async *editChatGenSettings(
      { active },
      chatId: string,
      settings: AppSchema.Chat['genSettings'],
      onSucces?: () => void
    ) {
      const res = await data.chats.editChatGenSettings(chatId, settings)
      if (res.error) toastStore.error(`Failed to update generation settings: ${res.error}`)
      if (res.result) {
        if (active && active.chat._id === chatId) {
          yield {
            active: {
              ...active,
              chat: { ...active.chat, genSettings: settings, genPreset: undefined },
            },
          }
          toastStore.success('Updated chat generation settings')
          onSucces?.()
        }
      }
    },
    async *editChatGenPreset({ active }, chatId: string, preset: string, onSucces?: () => void) {
      const res = await data.chats.editChatGenPreset(chatId, preset)
      if (res.error) toastStore.error(`Failed to update generation settings: ${res.error}`)
      if (res.result) {
        if (active && active.chat._id === chatId) {
          yield {
            active: {
              ...active,
              chat: { ...active.chat, genSettings: undefined, genPreset: preset },
            },
          }
          toastStore.success('Updated chat generation settings')
          onSucces?.()
        }
      }
    },
    async *getAllChats({ all }) {
      const res = await data.chats.getAllChats()
      if (res.error) {
        toastStore.error(`Could not retrieve chats`)
        return { all }
      }

      if (res.result) {
        const chars = res.result.characters.reduce<any>((prev, curr) => {
          prev[curr._id] = curr
          return prev
        }, {})
        return { all: { chats: res.result.chats.sort(sortDesc), chars } }
      }
    },
    getBotChats: async (_, characterId: string) => {
      const res = await data.chats.getBotChats(characterId)
      if (res.error) toastStore.error('Failed to retrieve conversations')
      if (res.result) {
        return {
          loaded: true,
          char: {
            char: res.result.character,
            chats: res.result.chats.sort(sortDesc),
          },
        }
      }
    },
    async *createChat(
      { all, char },
      characterId: string,
      props: NewChat,
      onSuccess?: (id: string) => void
    ) {
      const res = await data.chats.createChat(characterId, props)
      if (res.error) toastStore.error(`Failed to create conversation`)
      if (res.result) {
        const { characters } = characterStore.getState()
        const character = characters.list.find((ch) => ch._id === characterId)

        if (all?.chats) {
          yield { all: { ...all, chats: [res.result, ...all.chats] } }
        }

        if (char?.char._id === characterId) {
          yield { char: { ...char, chats: [res.result, ...char.chats] } }
        }

        yield { active: { chat: res.result, char: character!, participantIds: [] } }

        onSuccess?.(res.result._id)
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

    async *deleteChat({ active, all, char }, chatId: string, onSuccess?: Function) {
      const res = await data.chats.deleteChat(chatId)
      if (res.error) return toastStore.error(`Failed to delete chat: ${res.error}`)
      if (res.result) {
        toastStore.success('Successfully deleted chat')
        if (active?.chat._id === chatId) {
          yield { active: undefined }
        }

        if (all?.chats) {
          yield { all: { ...all, chats: all.chats.filter((ch) => ch._id !== chatId) } }
        }

        if (char?.chats) {
          yield { char: { ...char, chats: char.chats.filter((ch) => ch._id !== chatId) } }
        }

        onSuccess?.()
      }
    },

    async *importChat(
      { all, char },
      characterId: string,
      imported: ImportChat,
      onSuccess?: (chat: AppSchema.Chat) => void
    ) {
      const res = await data.chats.importChat(characterId, imported)
      if (res.error) toastStore.error(`Failed to import chat: ${res.error}`)
      if (res.result) {
        if (all?.chats) {
          yield { all: { ...all, chats: [res.result, ...all.chats] } }
        }

        if (char?.char._id === characterId) {
          yield { char: { ...char, chats: [res.result, ...char.chats] } }
        }

        onSuccess?.(res.result)
      }
    },

    async getChatSummary(_, chatId: string) {
      const res = await api.get(`/chat/${chatId}/summary`)
      console.log(res.result, res.error)
    },

    async showPrompt({ active }, _user: AppSchema.User, msg: AppSchema.ChatMessage) {
      if (!active) return

      const { msgs } = msgStore.getState()
      const entities = await data.msg.getPromptEntities()

      const prompt = createPrompt({
        ...entities,
        messages: msgs.filter((m) => m.createdAt < msg.createdAt),
      })

      return { prompt }
    },

    closePrompt() {
      return { prompt: undefined }
    },
  }
})

function toMemberKeys(prev: Record<string, AppSchema.Profile>, curr: AppSchema.Profile) {
  prev[curr.userId] = curr
  return prev
}

subscribe('profile-handle-changed', { userId: 'string', handle: 'string' }, (body) => {
  const { activeMembers, memberIds } = chatStore()
  if (!memberIds[body.userId]) return

  const nextMembers = activeMembers.map((am) =>
    am.userId === body.userId ? { ...am, handle: body.handle } : am
  )

  const next = { ...memberIds[body.userId], handle: body.handle }

  memberIds[body.userId] = { ...memberIds[body.userId], handle: body.handle }

  chatStore.setState({
    activeMembers: nextMembers,
    memberIds: { ...memberIds, [body.userId]: next },
  })
})

subscribe('chat-deleted', { chatId: 'string' }, (body) => {
  const { all, active, char } = chatStore()
  if (active?.chat._id === body.chatId) {
    chatStore.setState({ active: undefined })
  }

  if (all?.chats) {
    const next = all.chats.filter((ch) => ch._id !== body.chatId)
    chatStore.setState({ all: { ...all, chats: next } })
  }

  if (char?.chats) {
    const next = char.chats.filter((ch) => ch._id !== body.chatId)
    chatStore.setState({ char: { ...char, chats: next } })
  }
})

function sortDesc(left: { updatedAt: string }, right: { updatedAt: string }): number {
  return left.updatedAt > right.updatedAt ? -1 : left.updatedAt === right.updatedAt ? 0 : 1
}

subscribe('message-created', { msg: 'any', chatId: 'string' }, (body) => {
  if (!body.msg.userId) return
  chatStore.getMemberProfile(body.chatId, body.msg.userId)
})

subscribe('member-removed', { memberId: 'string', chatId: 'string' }, (body) => {
  const profile = getStore('user').getState().profile
  if (!profile) return

  const { activeMembers, active } = chatStore.getState()

  if (!active?.chat) return
  if (active.chat._id !== body.chatId) return

  const nextIds = active.participantIds.filter((id) => id !== body.memberId)
  const nextMembers = activeMembers.filter((mem) => mem.userId !== body.memberId)
  chatStore.setState({ activeMembers: nextMembers, active: { ...active, participantIds: nextIds } })
})

subscribe(
  'member-added',
  {
    chatId: 'string',
    profile: { kind: 'any', userId: 'string', handle: 'string', _id: 'string', avatar: 'string?' },
  },
  (body) => {
    const { active, activeMembers, memberIds } = chatStore.getState()
    if (!active || active.chat._id !== body.chatId) return

    const nextMembers = activeMembers.concat(body.profile)
    const nextProfileMap = { ...memberIds, [body.profile.userId]: body.profile }
    const nextIds = active.participantIds.concat(body.profile.userId)
    const nextChat = {
      ...active.chat,
      memberIds: active.chat.memberIds.concat(body.profile.userId),
    }
    chatStore.setState({
      activeMembers: nextMembers,
      memberIds: nextProfileMap,
      active: { ...active, participantIds: nextIds, chat: nextChat },
    })
  }
)
