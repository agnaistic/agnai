import { AppSchema } from '../../srv/db/schema'
import { api } from './api'
import { createStore } from './create'
import { subscribe } from './socket'
import { toastStore } from './toasts'

type MsgStore = {
  msgs: AppSchema.ChatMessage[]
  partial?: string
  retrying?: AppSchema.ChatMessage
  waiting: boolean
}

export const msgStore = createStore<MsgStore>('messages', {
  msgs: [],
  waiting: false,
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

      yield { partial: '', waiting: true }

      const [message, replace] = msgs.slice(-2)
      yield { msgs: msgs.slice(0, -1), retrying: replace, partial: '' }

      await api.post<string | AppSchema.ChatMessage>(`/chat/${chatId}/retry/${replace._id}`, {
        message: message.msg,
        history: msgs.slice(-22, -2),
      })
    },
    async resend({ msgs }, chatId: string, msgId: string) {
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

      yield { partial: '', waiting: true }

      await api.post<string | AppSchema.ChatMessage>(`/chat/${chatId}/message`, {
        message,
        history: msgs.slice(-20),
        retry,
      })
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

subscribe('message-partial', { partial: 'string' }, (body) => {
  msgStore.setState({ partial: body.partial })
})

subscribe('message-retry', { messageId: 'string', chatId: 'string', message: 'string' }, (body) => {
  const { retrying, msgs } = msgStore.getState()
  if (!retrying) return

  msgStore.setState({
    partial: undefined,
    retrying: undefined,
    waiting: false,
    msgs: msgs.concat({ ...retrying, msg: body.message }),
  })
})

subscribe('message-created', { msg: 'any' }, (body) => {
  const { msgs } = msgStore.getState()

  // If the message is from a user don't clear the "waiting for response" flags
  if (body.msg.userId) {
    msgStore.setState({ msgs: msgs.concat(body.msg) })
  } else {
    msgStore.setState({ msgs: msgs.concat(body.msg), partial: undefined, waiting: false })
  }
})
