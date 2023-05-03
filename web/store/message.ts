import { v4 } from 'uuid'
import { AppSchema } from '../../srv/db/schema'
import { EVENTS, events } from '../emitter'
import { getAssetUrl } from '../shared/util'
import { isLoggedIn } from './api'
import { createStore } from './create'
import { getImageData } from './data/chars'
import { subscribe } from './socket'
import { toastStore } from './toasts'
import { GenerateOpts, msgsApi } from './data/messages'
import { imageApi } from './data/image'
import { localApi } from './data/storage'

type ChatId = string

export type MsgState = {
  activeChatId: string
  activeCharId: string
  msgs: AppSchema.ChatMessage[]
  partial?: string
  retrying?: AppSchema.ChatMessage
  waiting?: { chatId: string; mode?: GenerateOpts['kind']; userId?: string }
  retries: Record<string, string[]>
  nextLoading: boolean
  showImage?: AppSchema.ChatMessage
  imagesSaved: boolean

  /**
   * Ephemeral image messages
   *
   * These will be 'inserted' into chats by 'createdAt' timestamp
   */
  images: Record<ChatId, AppSchema.ChatMessage[]>
}

const initState: MsgState = {
  activeChatId: '',
  activeCharId: '',
  msgs: [],
  images: {},
  retries: {},
  nextLoading: false,
  imagesSaved: false,
  waiting: undefined,
  partial: undefined,
  retrying: undefined,
}

export const msgStore = createStore<MsgState>(
  'messages',
  initState
)((get, set) => {
  events.on('logged-out', () => {
    msgStore.setState(initState)
  })

  events.on(EVENTS.loggedIn, () => {
    msgStore.setState({ retries: {} })
  })

  events.on(EVENTS.init, (init) => {
    msgStore.setState({ imagesSaved: init.config.imagesSaved })
  })

  return {
    async *getNextMessages({ msgs, activeChatId, nextLoading }) {
      if (nextLoading) return
      const msg = msgs[0]
      if (!msg || msg.first) return

      yield { nextLoading: true }

      const before = msg.createdAt

      const res = await msgsApi.getMessages(activeChatId, before)
      yield { nextLoading: false }
      if (res.result && res.result.messages.length) {
        return { msgs: res.result.messages.concat(msgs) }
      }

      if (res.result && !res.result.messages.length) {
        return {
          msgs: msgs.map((msg, i) => {
            if (i === 0) return { ...msg, first: true }
            return msg
          }),
        }
      }
    },

    async *editMessage({ msgs }, msgId: string, msg: string, onSuccess?: Function) {
      const prev = msgs.find((m) => m._id === msgId)
      if (!prev) return toastStore.error(`Cannot find message`)

      const res = await msgsApi.editMessage(prev, msg)
      if (res.error) {
        toastStore.error(`Failed to update message: ${res.error}`)
      }
      if (res.result) {
        yield { msgs: msgs.map((m) => (m._id === msgId ? { ...m, msg } : m)) }
        onSuccess?.()
      }
    },

    async *continuation({ msgs }, chatId: string, onSuccess?: () => void) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      const [_, replace] = msgs.slice(-2)
      yield { partial: '', waiting: { chatId, mode: 'continue' }, retrying: replace }

      addMsgToRetries(replace)

      const res = await msgsApi.generateResponseV2({ kind: 'continue' })

      if (res.error) {
        toastStore.error(`Generation request failed: ${res.error}`)
        yield { partial: undefined, waiting: undefined }
      }

      if (res.result) onSuccess?.()
    },

    async *retry({ msgs }, chatId: string, onSuccess?: () => void) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      const [_, replace] = msgs.slice(-2)
      yield { partial: '', waiting: { chatId, mode: 'retry' }, retrying: replace }

      addMsgToRetries(replace)

      const res = await msgsApi.generateResponseV2({ kind: 'retry' })

      yield { msgs: msgs.slice(0, -1) }

      if (res.error) {
        toastStore.error(`Generation request failed: ${res.error}`)
        yield { partial: undefined, waiting: undefined }
      }

      if (res.result) onSuccess?.()
    },
    async resend({ msgs }, chatId: string, msgId: string) {
      const msgIndex = msgs.findIndex((m) => m._id === msgId)

      if (msgIndex === -1) {
        return toastStore.error('Cannot resend message: Message not found')
      }

      const msg = msgs[msgIndex]
      msgStore.send(chatId, msg.msg, 'retry')
    },
    async *selfGenerate({ activeChatId }) {
      msgStore.send(activeChatId, '', 'self')
    },
    async *send(
      { msgs },
      chatId: string,
      message: string,
      mode: 'send' | 'retry' | 'self',
      onSuccess?: () => void
    ) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }
      yield { partial: '', waiting: { chatId, mode } }

      switch (mode) {
        case 'self':
        case 'retry':
          var res = await msgsApi.generateResponseV2({ kind: mode })
          break

        case 'send':
          var res = await msgsApi.generateResponseV2({ kind: 'send', text: message })
          break
      }

      if (res.error) {
        toastStore.error(`Generation request failed: ${res.error}`)
        yield { partial: undefined, waiting: undefined }
      }

      if (res.result) onSuccess?.()
    },
    async *confirmSwipe({ retries }, msgId: string, position: number, onSuccess?: Function) {
      const replacement = retries[msgId]?.[position]
      if (!retries || !replacement) {
        return toastStore.error(`Cannot confirm swipe: Swipe state is stale`)
      }

      const list = retries[msgId]
      list.splice(position, 1)
      const next = [replacement].concat(list)

      yield { retries: { ...retries, [msgId]: next } }
      msgStore.editMessage(msgId, replacement, onSuccess)
    },
    async deleteMessages({ msgs, activeChatId }, fromId: string) {
      const index = msgs.findIndex((m) => m._id === fromId)
      if (index === -1) {
        return toastStore.error(`Cannot delete message: Message not found`)
      }

      const deleteIds = msgs.slice(index).map((m) => m._id)
      const res = await msgsApi.deleteMessages(activeChatId, deleteIds)

      if (res.error) {
        return toastStore.error(`Failed to delete messages: ${res.error}`)
      }
      return { msgs: msgs.slice(0, index) }
    },
    async *createImage({ activeChatId }, messageId?: string) {
      const onDone = (image: string) => handleImage(activeChatId, image)
      yield { waiting: { chatId: activeChatId, mode: 'send' } }

      const res = await imageApi.generateImage({ messageId, onDone })
      if (res.error) {
        yield { waiting: undefined }
        toastStore.error(`Failed to request image: ${res.error}`)
      }
    },
    showImage(_, msg?: AppSchema.ChatMessage) {
      return { showImage: msg }
    },
  }
})

/**
 *
 * @param chatId
 * @param image base64 encoded image or image url
 */
async function handleImage(chatId: string, image: string) {
  const { msgs, activeChatId, activeCharId, images, imagesSaved } = msgStore.getState()

  const chatImages = images[chatId] || []

  const isImageUrl =
    image.startsWith('/asset') ||
    image.startsWith('asset/') ||
    image.endsWith('png') ||
    image.endsWith('jpg') ||
    image.endsWith('jpeg')

  if (!imagesSaved && isImageUrl) {
    const base64 = await fetch(getAssetUrl(image))
      .then((res) => res.blob())
      .then(getImageData)

    image = base64!
  }

  if (!isImageUrl) {
    image = `data:image/png;base64,${image}`
  }

  const newMsg: AppSchema.ChatMessage = {
    _id: v4(),
    chatId,
    kind: 'chat-message',
    msg: image,
    adapter: 'image',
    characterId: activeCharId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  chatImages.push(newMsg)

  const nextMsgs = msgs.concat(newMsg)
  msgStore.setState({
    msgs: nextMsgs,
    waiting: undefined,
    images: { ...images, [chatId]: chatImages },
  })
}

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
    if (activeChatId !== body.chatId) return

    const prev = msgs.find((msg) => msg._id === body.messageId)
    const next = msgs.filter((msg) => msg._id !== body.messageId)

    msgStore.setState({
      partial: undefined,
      retrying: undefined,
      waiting: undefined,
      msgs: next,
    })

    await Promise.resolve()

    addMsgToRetries({ _id: body.messageId, msg: body.message })

    if (retrying) {
      msgStore.setState({ msgs: next.concat({ ...retrying, msg: body.message }) })
    } else {
      if (activeChatId !== body.chatId || !prev) return
      msgStore.setState({
        msgs: msgs.map((msg) => (msg._id === body.messageId ? { ...msg, msg: body.message } : msg)),
      })
    }
  }
)

subscribe('message-created', { msg: 'any', chatId: 'string', generate: 'boolean?' }, (body) => {
  const { msgs, activeChatId } = msgStore.getState()
  if (activeChatId !== body.chatId) return
  const msg = body.msg as AppSchema.ChatMessage

  // If the message is from a user don't clear the "waiting for response" flags
  const nextMsgs = msgs.concat(msg)
  if (msg.userId && !body.generate) {
    msgStore.setState({ msgs: nextMsgs })
  } else {
    msgStore.setState({
      msgs: nextMsgs,
      partial: undefined,
      waiting: undefined,
    })
  }

  if (!isLoggedIn()) {
    localApi.saveMessages(body.chatId, nextMsgs)
  }

  addMsgToRetries(msg)
})

subscribe('image-failed', { chatId: 'string', error: 'string' }, (body) => {
  msgStore.setState({ waiting: undefined })
  toastStore.error(body.error)
})

subscribe('image-generated', { chatId: 'string', image: 'string' }, (body) => {
  handleImage(body.chatId, body.image)
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
    waiting: { chatId: body.chatId, mode: 'retry' },
  })
})

subscribe(
  'message-creating',
  { chatId: 'string', senderId: 'string?', mode: 'string?' },
  (body) => {
    const { waiting, activeChatId, retries } = msgStore.getState()
    if (body.chatId !== activeChatId) return

    msgStore.setState({
      waiting: { chatId: activeChatId, mode: body.mode as any, userId: body.senderId },
      partial: '',
    })
  }
)

subscribe('message-horde-eta', { eta: 'number', queue: 'number' }, (body) => {
  toastStore.normal(`Queue: ${body.queue}`)
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

    const chats = localApi.loadItem('chats')
    localApi.saveChats(
      localApi.replace(body.chatId, chats, { updatedAt: new Date().toISOString() })
    )
    localApi.saveMessages(body.chatId, next)

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
  if (!msg) return

  const { retries } = msgStore.getState()

  if (!retries[msg._id]) {
    retries[msg._id] = []
  }

  const next = retries[msg._id]

  if (!next.includes(msg.msg)) {
    next.unshift(msg.msg)
  }

  msgStore.setState({ retries: { ...retries, [msg._id]: next.slice() } })
}
