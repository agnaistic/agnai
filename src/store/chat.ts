import { AppSchema } from '../../server/db/schema'
import { api } from './api'
import { createStore } from './create'
import { toastStore } from './toasts'

type ChatState = {
  activeChat?: AppSchema.Chat
  msgs: AppSchema.ChatMessage[]
  characters: AppSchema.Character[]
  chats?: {
    character: AppSchema.Character
    list: AppSchema.Chat[]
  }
}

export const chatStore = createStore<ChatState>('chat', {
  msgs: [],
  characters: [],
})((get, set) => {
  return {
    getCharacters: async () => {
      const res = await api.get('/character')
      if (res.error) toastStore.error('Failed to retrieve characters')
      else {
        return { characters: res.result.characters }
      }
    },
    getChats: async ({ chats }, characterId: string) => {
      if (!chats) {
      }
      const res = await api.get<{ character: AppSchema.Character; chats: AppSchema.Chat[] }>(
        `/chat/${characterId}/chats`
      )
      if (res.error) toastStore.error('Failed to retrieve conversations')
      if (res.result) {
        return {
          chats: {
            character: res.result.character,
            list: res.result.chats,
          },
        }
      }
    },
    getMessages: async ({ chats }, chatId: string) => {
      const chat = chats?.list.find((ch) => ch._id === chatId)
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
        }
      }
    },
    createCharacter: async (_, char: NewCharacter) => {
      const res = await api.post<any>('/character', char)
      if (res.error) toastStore.error(`Failed to create character: ${res.error}`)
      else {
        toastStore.success(`Successfully created character`)
        console.log(res.result)
      }
    },
    send: async (_, name: string, content: string) => {},
  }
})

type NewCharacter = {
  name: string
  greeting: string
  scenario: string
  sampleChat: string
  avatar?: string
  persona: AppSchema.CharacterPersona
}
