import { AppSchema } from '../../server/db/schema'
import { api } from './api'
import { createStore } from './create'
import { toastStore } from './toasts'

type ChatState = {
  activeChat?: AppSchema.Chat
  msgs: AppSchema.ChatMessage[]
  characters: AppSchema.Character[]
  chats: AppSchema.Chat[]
}

export const chatStore = createStore<ChatState>('chat', {
  msgs: [],
  characters: [],
  chats: [],
})((get, set) => {
  return {
    getChats: async () => {
      const res = await api.get<{ chats: AppSchema.Chat[] }>('/chat')
      if (res.error) toastStore.error('Failed to retrieve conversations')
      else return { chats: res.result?.chats }
    },
    getMessages: async ({ chats }, chatId: string) => {
      const chat = chats.find((ch) => ch._id === chatId)
      if (!chat) {
        toastStore.warn('Cannot retrieve conversation: Chat does not exist')
        return
      }
      const res = await api.get<{ messages: AppSchema.ChatMessage[] }>(`/chat/${chatId}`)
      if (res.error) toastStore.error(`Failed to retrieve conversation`)
      if (res.result) {
        return {
          activeChat: chat,
          msgs: res.result.messages,
        }
      } else return { activeChat: res.result }
    },
    createChat: async ({ chats }, characterId: string, name?: string) => {
      const res = await api.post<AppSchema.Chat>('/chat', { characterId, name })
      if (res.error) toastStore.error(`Failed to create conversation`)
      if (res.result) {
        return {
          activeChat: res.result,
          chats: [res.result, ...chats],
        }
      }
    },
    send: async (_, name: string, content: string) => {},
  }
})
