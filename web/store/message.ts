import { AppSchema } from '../../srv/db/schema'
import { api } from './api'
import { createStore } from './create'
import { data } from './data'
import { local } from './data/storage'
import { subscribe } from './socket'
import { toastStore } from './toasts'
import { userStore } from './user'

export type MsgState = {
  activeChatId: string
  msgs: AppSchema.ChatMessage[]
  partial?: string
  retrying?: AppSchema.ChatMessage
  waiting?: string
  retries?: { msgId: string; list: string[] }
}

export const msgStore = createStore<MsgState>('messages', {
  activeChatId: '',
  msgs: [],
})((get, set) => {
  userStore.subscribe((curr, prev) => {
    if (!curr.loggedIn && prev.loggedIn) msgStore.logout()
    if (curr.loggedIn !== prev.loggedIn) {
      set({ retries: undefined })
    }
  })

  return {
    logout() {
      return {
        activeChatId: '',
        msgs: [],
        partial: undefined,
        retrying: undefined,
        waiting: undefined,
      }
    },
    async *editMessage({ msgs }, msgId: string, msg: string, onSuccess?: Function) {
      const prev = msgs.find((m) => m._id === msgId)
      if (!prev) return toastStore.error(`Cannot find message`)

      const res = await data.msg.editMessage(prev, msg)
      if (res.error) {
        toastStore.error(`Failed to update message: ${res.error}`)
      }
      if (res.result) {
        yield { msgs: msgs.map((m) => (m._id === msgId ? { ...m, msg } : m)) }
        onSuccess?.()
      }
    },

    async *retry({ msgs, retries }, chatId: string, cont?: string) {
      if (msgs.length < 3) {
        toastStore.error(`Cannot retry: Not enough messages`)
        return
      }

      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      yield { partial: '', waiting: chatId }

      const [message, replace] = msgs.slice(-2)

      yield { retrying: replace, partial: '' }
      if (retries?.msgId !== replace._id) {
        yield { retries: { msgId: replace._id, list: [] } }
      }

      if (!cont) {
        yield { msgs: msgs.slice(0, -1) }
      }

      addMsgToRetries(replace)

      const res = await data.msg.retryCharacterMessage(chatId, message, replace, cont)
      if (res.error) {
        toastStore.error(`Generation request failed: ${res.error}`)
        yield { partial: undefined, waiting: undefined }
      }
    },
    async resend({ msgs }, chatId: string, msgId: string) {
      const msgIndex = msgs.findIndex((m) => m._id === msgId)

      if (msgIndex === -1) {
        return toastStore.error('Cannot resend message: Message not found')
      }

      const msg = msgs[msgIndex]
      msgStore.send(chatId, msg.msg, true)
    },
    async *send({ msgs }, chatId: string, message: string, retry?: boolean) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }
      yield { partial: '', waiting: chatId }

      const res = retry
        ? await data.msg.retryUserMessage(chatId, message)
        : await data.msg.sendMessage(chatId, message)

      if (res.error) {
        toastStore.error(`Generation request failed: ${res.error}`)
        yield { partial: undefined, waiting: undefined }
      }
    },
    async *confirmSwipe({ retries }, position: number, onSuccess?: Function) {
      const replacement = retries?.list?.[position]
      if (!retries || !replacement) {
        return toastStore.error(`Cannot confirm swipe: Swipe state is stale`)
      }

      retries.list.splice(position, 1)
      const next = [replacement].concat(retries.list)

      yield { retries: { list: next, msgId: retries.msgId } }
      msgStore.editMessage(retries.msgId, replacement, onSuccess)
    },
    async deleteMessages({ msgs, activeChatId }, fromId: string) {
      const index = msgs.findIndex((m) => m._id === fromId)
      if (index === -1) {
        return toastStore.error(`Cannot delete message: Message not found`)
      }

      const deleteIds = msgs.slice(index).map((m) => m._id)
      const res = await data.msg.deleteMessages(activeChatId, deleteIds)

      if (res.error) {
        return toastStore.error(`Failed to delete messages: ${res.error}`)
      }
      return { msgs: msgs.slice(0, index) }
    },
    async *createImage(_, chatId: string) {
      const res = await api.post(`/chat/${chatId}/image`)
      if (res.error) toastStore.error(`Failed to request image: ${res.error}`)
      if (res.result) {
        console.log(res.result)
      }
    },
  }
})

subscribe('message-partial', { partial: 'string', chatId: 'string' }, (body) => {
  const { activeChatId } = msgStore.getState()
  if (body.chatId !== activeChatId) return

  msgStore.setState({ partial: body.partial })
})

subscribe(
  'message-retry',
  { messageId: 'string', chatId: 'string', message: 'string', continue: 'boolean?' },
  async (body) => {
    const { retrying, msgs, activeChatId } = msgStore.getState()
    if (!retrying) return
    if (activeChatId !== body.chatId) return

    const next = msgs.filter((msg) => msg._id !== body.messageId)

    msgStore.setState({
      partial: undefined,
      retrying: undefined,
      waiting: undefined,
      msgs: next,
    })

    await Promise.resolve()

    addMsgToRetries({ _id: body.messageId, msg: body.message })

    msgStore.setState({ msgs: next.concat({ ...retrying, msg: body.message }) })
  }
)

subscribe('message-created', { msg: 'any', chatId: 'string' }, (body) => {
  const { msgs, activeChatId } = msgStore.getState()
  if (activeChatId !== body.chatId) return
  const msg = body.msg as AppSchema.ChatMessage

  // If the message is from a user don't clear the "waiting for response" flags
  if (msg.userId) {
    msgStore.setState({ msgs: msgs.concat(msg) })
  } else {
    msgStore.setState({
      msgs: msgs.concat(msg),
      partial: undefined,
      waiting: undefined,
      retries: undefined,
    })
  }

  addMsgToRetries(msg)
})

subscribe('message-error', { error: 'any', chatId: 'string' }, (body) => {
  toastStore.error(`Failed to generate response: ${body.error}`)
  msgStore.setState({ partial: undefined, waiting: undefined })
})

subscribe('messages-deleted', { ids: ['string'] }, (body) => {
  const ids = new Set(body.ids)
  const { msgs } = msgStore.getState()
  msgStore.setState({ msgs: msgs.filter((msg) => !ids.has(msg._id)) })
})

subscribe('message-edited', { messageId: 'string', message: 'string' }, (body) => {
  const { msgs } = msgStore.getState()
  msgStore.setState({
    msgs: msgs.map((msg) => (msg._id === body.messageId ? { ...msg, msg: body.message } : msg)),
  })
})

subscribe('message-retrying', { chatId: 'string', messageId: 'string' }, (body) => {
  const { msgs, activeChatId, retrying } = msgStore.getState()

  const [message, replace] = msgs.slice(-2)

  if (activeChatId !== body.chatId) return
  if (retrying) return
  if (replace._id !== body.messageId) return

  msgStore.setState({
    msgs: msgs.slice(0, -1),
    partial: '',
    retrying: replace,
    waiting: body.chatId,
  })
})

subscribe('message-creating', { chatId: 'string' }, (body) => {
  const { waiting, activeChatId, retries } = msgStore.getState()
  if (body.chatId !== activeChatId) return

  msgStore.setState({ waiting: activeChatId, partial: '' })
})

subscribe('message-horde-eta', { eta: 'number' }, (body) => {
  toastStore.normal(`Response ETA: ${body.eta}s`)
})

subscribe(
  'guest-message-created',
  { msg: 'any', chatId: 'string', continue: 'boolean?' },
  (body) => {
    const { msgs, activeChatId, retrying } = msgStore.getState()
    if (activeChatId !== body.chatId) return

    if (retrying) {
      body.msg._id = retrying._id
    }

    const next = msgs.filter((m) => m._id !== retrying?._id).concat(body.msg)

    const chats = local.loadItem('chats')
    local.saveChats(local.replace(body.chatId, chats, { updatedAt: new Date().toISOString() }))
    local.saveMessages(body.chatId, next)

    addMsgToRetries(body.msg)

    msgStore.setState({
      msgs: next,
      retrying: undefined,
      partial: undefined,
      waiting: undefined,
    })
  }
)

/**
 * This may consume an annoying amount of memory if a user does not refresh often
 */
function addMsgToRetries(msg: Pick<AppSchema.ChatMessage, '_id' | 'msg'>) {
  const { retries } = msgStore.getState()

  if (retries?.msgId !== msg._id) {
    return
  }
  const next = retries ? { ...retries } : { msgId: msg._id, list: [] }

  if (!next.list.includes(msg.msg)) {
    next.list.unshift(msg.msg)
  }

  next.list = next.list.slice()

  msgStore.setState({ retries: next })
}
