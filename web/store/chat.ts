import { AppSchema } from '../../srv/db/schema'
import { api } from './api'
import { createStore } from './create'
import { msgStore } from './message'
import { toastStore } from './toasts'

type ChatState = {
  lastChatId: string | null
  loaded: boolean
  list: AppSchema.Chat[]
  character?: AppSchema.Character
  active?: AppSchema.Chat
  activeMembers: AppSchema.Profile[]
  memberIds: { [userId: string]: AppSchema.Profile }
}

export type NewChat = {
  name: string
  greeting: string
  scenario: string
  sampleChat: string
}

export const chatStore = createStore<ChatState>('chat', {
  lastChatId: localStorage.getItem('lastChatId'),
  loaded: false,
  list: [],
  activeMembers: [],
  memberIds: {},
})((get, set) => {
  return {
    logout() {
      return {
        lastChatId: null,
        loaded: false,
        list: [],
        character: undefined,
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

        msgStore.setState({ msgs: res.result.messages })

        return {
          lastChatId: id,
          active: res.result.chat,
          activeMembers: res.result.members,
          memberIds: res.result.members.reduce(toMemberKeys, {}),
          character: res.result.character,
        }
      }
    },
    async editChat({ list }, id: string, update: Partial<AppSchema.Chat>, onSuccess?: () => void) {
      const res = await api.method<AppSchema.Chat>('put', `/chat/${id}`, update)
      if (res.error) {
        toastStore.error(`Failed to update chat: ${res.error}`)
        return
      }

      if (res.result) {
        onSuccess?.()
        toastStore.success('Updated chat settings')
        return {
          list: list.map((l) => (l._id === id ? res.result! : l)),
          active: res.result,
        }
      }
    },
    getChats: async (_, characterId: string) => {
      const res = await api.get<{ character: AppSchema.Character; chats: AppSchema.Chat[] }>(
        `/chat/${characterId}/chats`
      )
      if (res.error) toastStore.error('Failed to retrieve conversations')
      if (res.result) {
        return {
          loaded: true,
          character: res.result.character,
          list: res.result.chats,
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
        yield { active: res.result }

        onSuccess?.(res.result._id)
      }
    },
  }
})

function toMemberKeys(prev: Record<string, AppSchema.Profile>, curr: AppSchema.Profile) {
  prev[curr.userId] = curr
  return prev
}
