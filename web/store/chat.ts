import { AppSchema } from '../../srv/db/schema'
import { api } from './api'
import { characterStore } from './character'
import { createStore } from './create'
import { msgStore } from './message'
import { subscribe } from './socket'
import { toastStore } from './toasts'

type ChatState = {
  lastChatId: string | null
  loaded: boolean
  all?: {
    chats: AppSchema.Chat[]
    chars: { [charId: string]: AppSchema.Character }
  }
  char?: {
    chats: AppSchema.Chat[]
    char: AppSchema.Character
  }
  active?: {
    chat: AppSchema.Chat
    char: AppSchema.Character
  }
  activeMembers: AppSchema.Profile[]
  memberIds: { [userId: string]: AppSchema.Profile }
}

export type NewChat = {
  name: string
  greeting: string
  scenario: string
  sampleChat: string
  overrides: AppSchema.Chat['overrides']
}

export const chatStore = createStore<ChatState>('chat', {
  lastChatId: localStorage.getItem('lastChatId'),
  loaded: false,
  activeMembers: [],
  memberIds: {},
})((get, set) => {
  return {
    logout() {
      localStorage.removeItem('lastChildId')
      return {
        lastChatId: null,
        loaded: false,
        all: undefined,
        char: undefined,
        active: undefined,
        activeMembers: [],
        memberIds: {},
      }
    },
    async getChat(_, id: string) {
      const res = await api.get<{
        chat: AppSchema.Chat
        messages: AppSchema.ChatMessage[]
        character: AppSchema.Character
        members: AppSchema.Profile[]
      }>(`/chat/${id}`)
      if (res.error) toastStore.error(`Failed to retrieve conversation: ${res.error}`)
      if (res.result) {
        localStorage.setItem('lastChatId', id)

        msgStore.setState({ msgs: res.result.messages, activeChatId: id })

        return {
          lastChatId: id,
          active: {
            chat: res.result.chat,
            char: res.result.character,
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
      const res = await api.method<AppSchema.Chat>('put', `/chat/${id}`, update)
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
          yield { active: { chat: res.result!, char: active.char } }
        }
      }
    },
    async *getAllChats({ all }) {
      const res = await api.get<{ chats: AppSchema.Chat[]; characters: AppSchema.Character[] }>(
        '/chat'
      )

      if (res.error) {
        toastStore.error(`Could not retrieve chats`)
        return { all }
      }
      if (res.result) {
        const chars = res.result.characters.reduce<any>((prev, curr) => {
          prev[curr._id] = curr
          return prev
        }, {})
        return { all: { chats: res.result.chats, chars } }
      }
    },
    getBotChats: async (_, characterId: string) => {
      const res = await api.get<{ character: AppSchema.Character; chats: AppSchema.Chat[] }>(
        `/chat/${characterId}/chats`
      )
      if (res.error) toastStore.error('Failed to retrieve conversations')
      if (res.result) {
        return {
          loaded: true,
          char: {
            char: res.result.character,
            chats: res.result.chats,
          },
        }
      }
    },
    async *createChat(
      state,
      characterId: string,
      props: NewChat,
      onSuccess?: (id: string) => void
    ) {
      const res = await api.post<AppSchema.Chat>('/chat', { characterId, ...props })
      if (res.error) toastStore.error(`Failed to create conversation`)
      if (res.result) {
        const { characters } = characterStore.getState()
        const character = characters.list.find((ch) => ch._id === characterId)
        yield { active: { chat: res.result, char: character! } }

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
