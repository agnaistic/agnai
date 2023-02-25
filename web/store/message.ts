import { AppSchema } from '../../srv/db/schema'
import { api } from './api'
import { createStore } from './create'
import { toastStore } from './toasts'

type MsgStore = {
  msgs: AppSchema.ChatMessage[]
  partial?: string
}

export const msgStore = createStore<MsgStore>('messages', {
  msgs: [],
})((get) => {
  return {
    async editMessage({ msgs }, msgId: string, msg: string) {
      const res = await api.method('put', `/chat/${msgId}/message`, { message: msg })
      if (res.error) {
        toastStore.error(`Failed to update message: ${res.error}`)
      }
      if (res.result) {
        return { msgs: msgs.map((m) => (m._id === msgId ? { ...m, msg } : m)) }
      }
    },

    async *retry({ msgs }, chatId: string) {
      if (msgs.length < 3) {
        toastStore.error(`Cannot retry: Not enough messages`)
        return
      }

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
        { message: message.msg, history: msgs.slice(-22, -2) }
      )

      let current = ''
      for await (const part of stream) {
        if (typeof part === 'string') {
          if (part.length === 0) continue
          current = part
          yield { partial: current }
          continue
        } else if (typeof part === 'object' && 'error' in part) {
          toastStore.error(`Failed to generate message`)
          yield { partial: undefined, msgs: msgs.concat(replace) }
          return
        }
      }

      yield { msgs: get().msgs.concat({ ...replace, msg: current }), partial: undefined }
    },
    async *resend({ msgs }, chatId: string, msgId: string) {
      const msgIndex = msgs.findIndex((m) => m._id === msgId)
      const msg = msgs[msgIndex]

      if (msgIndex === -1) {
        return toastStore.error('Cannot resend message: Message not found')
      }

      msgStore.send(chatId, msg.msg, true)
    },
    async *send({ msgs }, chatId: string, message: string, retry?: boolean) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      yield { partial: '' }

      const stream = await api.streamPost<string | AppSchema.ChatMessage>(
        `/chat/${chatId}/message`,
        { message, history: msgs.slice(-20), retry }
      )

      let current = ''
      for await (const part of stream) {
        if (typeof part === 'string') {
          if (part.length === 0) continue
          current = part
          yield { partial: current }
          continue
        }
        if (typeof part === 'object' && 'error' in part) {
          toastStore.error(`Failed to generate message`)
          yield { partial: undefined }
          return
        }
        const { msgs } = get()
        yield { msgs: [...msgs, part] }
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
