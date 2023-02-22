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
  msgs: AppSchema.ChatMessage[]
  chats?: {
    loaded: boolean
    character: AppSchema.Character
    list: AppSchema.Chat[]
  }
  partial?: string
}

export type NewChat = {
  name: string
  greeting: string
  scenario: string
  sampleChat: string
}

export const chatStore = createStore<ChatState>('chat', {
  lastChatId: localStorage.getItem('lastChatId'),
  msgs: [],
})((get, set) => {
  return {
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

    async editMessage({ msgs }, msgId: string, msg: string) {
      const res = await api.method('put', `/chat/${msgId}/message`, { message: msg })
      if (res.error) {
        toastStore.error(`Failed to update message: ${res.error}`)
      }
      if (res.result) {
        return { msgs: msgs.map((m) => (m._id === msgId ? { ...m, msg } : m)) }
      }
    },

    async *retry({ activeChat, msgs }) {
      if (msgs.length < 3) {
        toastStore.error(`Cannot retry: Not enough messages`)
        return
      }

      const chatId = activeChat?.chat._id
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      yield { partial: '' }

      const [message, replace] = msgs.slice(-2)
      yield { msgs: msgs.slice(0, -1) }

      const stream = await api.streamPost<string | AppSchema.ChatMessage>(
        `/chat/${chatId}/retry/${replace._id}`,
        { message: message.msg, history: msgs.slice(-12, -2) }
      )

      let current = ''
      for await (const message of stream) {
        if (typeof message === 'string') {
          current += message
          yield { partial: current }
        } else if ('error' in message) {
          toastStore.error(`Failed to generate message`)
          yield { partial: undefined }
          return
        }
      }

      current = sanitise(current)

      yield { msgs: get().msgs.concat({ ...replace, msg: current }), partial: undefined }
      console.log('Message: ', current)
    },
    async *send({ activeChat, msgs }, message: string) {
      const chatId = activeChat?.chat._id
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      yield { partial: '' }

      let current = ''

      const stream = await api.streamPost<string | AppSchema.ChatMessage>(
        `/chat/${chatId}/message`,
        { message, history: msgs.slice(-10) }
      )

      for await (const message of stream) {
        if (typeof message === 'string') {
          current += message
          yield { partial: current }
        } else {
          if ('error' in message) {
            toastStore.error(`Failed to generate message`)
            yield { partial: undefined }
            return
          }
          const { msgs } = get()
          yield { msgs: [...msgs, message] }
        }
      }

      yield { partial: undefined }
    },
    async deleteMessages({ msgs }, fromId: string) {
      const index = msgs.findIndex((m) => m._id === fromId)
      if (index === -1) {
        return toastStore.error(`Cannot delete message: Message not found`)
      }

      const deleteIds = msgs.slice(index).map((m) => m._id)
      const res = await api.method('delete', `/chat/messages`, { ids: deleteIds })

      if (res.error) {
        return toastStore.error(`Failed to delete messages: ${res.error}`)
      }
      return { msgs: msgs.slice(0, index) }
    },
  }
})

function sanitise(generated: string) {
  return generated.replace(/\s+/g, ' ').trim()
}
