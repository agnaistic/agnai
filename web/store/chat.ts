import { AppSchema } from '../../srv/db/schema'
import { api } from './api'
import { createStore } from './create'
import { toastStore } from './toasts'

type ChatState = {
  lastChatId: string | null
  activeChat?: {
    chat: AppSchema.Chat
    character: AppSchema.Character
  }
  responding: boolean
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
  partial?: {
    message: string
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
  responding: false,
  lastChatId: localStorage.getItem('lastChatId'),
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
        localStorage.setItem('lastChatId', id)
        return {
          lastChatId: id,
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
    createCharacter: async ({ characters }, char: NewCharacter, onSuccess?: () => void) => {
      const res = await api.post<AppSchema.Character>('/character', char)
      if (res.error) toastStore.error(`Failed to create character: ${res.error}`)
      if (res.result) {
        toastStore.success(`Successfully created character`)
        chatStore.getCharacters()
        onSuccess?.()
      }
    },
    async *send({ activeChat, msgs }, message: string) {
      const chatId = activeChat?.chat._id
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        return
      }

      let current = ''
      yield { responding: true }
      const stream = await api.streamPost<string | AppSchema.ChatMessage>(
        `/chat/${chatId}/message`,
        { message, history: msgs.slice(-10) }
      )

      for await (const message of stream) {
        if (typeof message === 'string') {
          current += message
          yield { partial: { message: current } }
        } else {
          const { msgs } = get()
          yield { msgs: [...msgs, message] }
        }
      }
      yield { responding: false, partial: undefined }
    },
  }
})
