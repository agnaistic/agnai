import { AppSchema } from '../../server/db/schema'
import { api } from './api'
import { createStore } from './create'
import { toastStore } from './toasts'

type ChatState = {
  activeChat?: {
    chat: AppSchema.Chat
    character: AppSchema.Character
  }
  msgs: AppSchema.ChatMessage[]
  characters: {
    loaded: boolean
    list: AppSchema.Character[]
  }
  chats?: {
    loaded: boolean
    character: AppSchema.Character
    list: AppSchema.Chat[]
  }
}

export type NewChat = {
  name: string
  greeting: string
  scenario: string
  sampleChat: string
}

export type NewCharacter = {
  name: string
  greeting: string
  scenario: string
  sampleChat: string
  avatar?: string
  persona: AppSchema.CharacterPersona
}

export const chatStore = createStore<ChatState>('chat', {
  msgs: [],
  characters: { loaded: false, list: [] },
})((get, set) => {
  return {
    getCharacters: async () => {
      const res = await api.get('/character')
      if (res.error) toastStore.error('Failed to retrieve characters')
      else {
        return { characters: { list: res.result.characters, loaded: true } }
      }
    },
    async getChat(_, id: string) {
      const res = await api.get<{
        chat: AppSchema.Chat
        messages: AppSchema.ChatMessage[]
        character: AppSchema.Character
      }>(`/chat/${id}`)
      if (res.error) toastStore.error(`Failed to retrieve conversation: ${res.error}`)
      if (res.result) {
        return {
          activeChat: {
            chat: res.result.chat,
            character: res.result.character,
          },
          msgs: res.result.messages,
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
          chats: {
            loaded: true,
            character: res.result.character,
            list: res.result.chats,
          },
        }
      }
    },
    // getMessages: async ({ chats }, chatId: string) => {
    //   const chat = chats?.list.find((ch) => ch._id === chatId)
    //   if (!chat) {
    //     toastStore.warn('Cannot retrieve conversation: Chat does not exist')
    //     return
    //   }
    //   const res = await api.get<{ messages: AppSchema.ChatMessage[] }>(`/chat/${chatId}`)
    //   if (res.error) toastStore.error(`Failed to retrieve conversation`)
    //   if (res.result) {
    //     return {
    //       activeChat: chat,
    //       msgs: res.result.messages,
    //     }
    //   } else return { activeChat: res.result }
    // },
    async *createChat(
      state,
      characterId: string,
      props: NewChat,
      onSuccess?: (id: string) => void
    ) {
      const res = await api.post<AppSchema.Chat>('/chat', { characterId, ...props })
      if (res.error) toastStore.error(`Failed to create conversation`)
      if (res.result) {
        const character = state.chats?.character!
        yield {
          activeChat: { character, chat: res.result },
        }

        onSuccess?.(res.result._id)
      }
    },
    createCharacter: async (_, char: NewCharacter) => {
      const res = await api.post<any>('/character', char)
      if (res.error) toastStore.error(`Failed to create character: ${res.error}`)
      else {
        toastStore.success(`Successfully created character`)
      }
    },
    send: async (_, name: string, content: string) => {},
  }
})
