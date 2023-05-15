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
import { userStore } from './user'
import { localApi } from './data/storage'
import { chatStore } from './chat'
import { voiceApi } from './data/voice'
import { VoiceSettings, VoiceWebSynthesisSettings } from '../../srv/db/texttospeech-schema'
import { defaultCulture } from '../shared/CultureCodes'
import { createSpeech, pauseSpeech } from '../shared/Audio/speech'

type ChatId = string

export type VoiceState = 'generating' | 'playing'

type ChatMessageExt = AppSchema.ChatMessage & { voiceUrl?: string }

export type MsgState = {
  activeChatId: string
  activeCharId: string
  msgs: ChatMessageExt[]
  partial?: string
  retrying?: AppSchema.ChatMessage
  waiting?: { chatId: string; mode?: GenerateOpts['kind']; userId?: string; characterId: string }
  retries: Record<string, string[]>
  nextLoading: boolean
  imagesSaved: boolean
  speaking: { messageId: string; status: VoiceState } | undefined

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
  speaking: undefined,
}

export const msgStore = createStore<MsgState>(
  'messages',
  initState
)(() => {
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
      yield {
        partial: '',
        waiting: { chatId, mode: 'continue', characterId: replace.characterId! },
        retrying: replace,
      }

      addMsgToRetries(replace)

      const res = await msgsApi.generateResponseV2({ kind: 'continue' })

      if (res.error) {
        toastStore.error(`(Continue) Generation request failed: ${res.error}`)
        yield { partial: undefined, waiting: undefined }
      }

      if (res.result) onSuccess?.()
    },

    async *request(_, chatId: string, characterId: string, onSuccess?: () => void) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }
      yield { partial: undefined, waiting: { chatId, mode: 'request', characterId } }

      const res = await msgsApi.generateResponseV2({ kind: 'request', characterId })

      if (res.error) {
        toastStore.error(`(Bot) Generation request failed: ${res.error}`)
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
      yield {
        partial: '',
        waiting: { chatId, mode: 'retry', characterId: replace.characterId! },
        retrying: replace,
      }

      addMsgToRetries(replace)

      const res = await msgsApi.generateResponseV2({ kind: 'retry' })

      yield { msgs: msgs.slice(0, -1) }

      if (res.error) {
        toastStore.error(`(Retry) Generation request failed: ${res.error}`)
        yield { partial: undefined, waiting: undefined }
      } else if (res.result) {
        onSuccess?.()
      }
    },
    async resend({ msgs }, chatId: string, msgId: string) {
      const msgIndex = msgs.findIndex((m) => m._id === msgId)

      if (msgIndex === -1) {
        return toastStore.error('Cannot resend message: Message not found')
      }

      const msg = msgs[msgIndex]
      msgStore.send(chatId, msg.msg, 'retry', undefined)
    },
    async *selfGenerate({ activeChatId }) {
      msgStore.send(activeChatId, '', 'self', undefined)
    },
    async *send(
      { activeCharId },
      chatId: string,
      message: string,
      mode: 'send' | 'ooc' | 'retry' | 'self' | 'send-noreply',
      onSuccess?: () => void
    ) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      let res: { result?: any; error?: string }

      yield { partial: '', waiting: { chatId, mode, characterId: activeCharId } }

      switch (mode) {
        case 'self':
        case 'retry':
          res = await msgsApi.generateResponseV2({ kind: mode })
          break

        case 'send':
          res = await msgsApi.generateResponseV2({ kind: mode, text: message })
          break

        case 'ooc':
        case 'send-noreply':
          res = await msgsApi.generateResponseV2({ kind: mode, text: message })
          yield { partial: undefined, waiting: undefined }
          break

        default:
          res = { error: `Unknown mode ${mode}`, result: undefined }
      }

      if (res.error) {
        toastStore.error(`(Send) Generation request failed: ${res?.error ?? 'Unknown error'}`)
        yield { partial: undefined, waiting: undefined }
      } else if (res.result) {
        onSuccess?.()
      }
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
    async deleteMessages({ msgs, activeChatId }, fromId: string, deleteOne?: boolean) {
      const index = msgs.findIndex((m) => m._id === fromId)
      if (index === -1) {
        return toastStore.error(`Cannot delete message: Message not found`)
      }

      const deleteIds = deleteOne ? [fromId] : msgs.slice(index).map((m) => m._id)
      const res = await msgsApi.deleteMessages(activeChatId, deleteIds)

      if (res.error) {
        return toastStore.error(`Failed to delete messages: ${res.error}`)
      }

      const removed = new Set(deleteIds)
      return { msgs: msgs.filter((msg) => !removed.has(msg._id)) }
    },
    stopSpeech() {
      pauseSpeech()
      return { speaking: undefined }
    },
    async *textToSpeech(
      { activeChatId, msgs },
      messageId: string,
      text: string,
      voice: VoiceSettings,
      culture?: string
    ) {
      pauseSpeech()

      if (!voice.service) {
        yield { speaking: undefined }
        return
      }

      yield { speaking: { messageId, status: 'generating' } }

      if (voice.service === 'webspeechsynthesis') {
        const isSuported = !!window.speechSynthesis
        if (!isSuported) {
          toastStore.error(`Speech synthesis not supported on this browser`)
          return
        }

        try {
          await playVoiceFromBrowser(voice, text, culture ?? defaultCulture, messageId)
        } catch (e: any) {
          toastStore.error(`Failed to play web speech synthesis: ${e.message}`)
        }

        return
      }

      const msg = msgs.find((m) => m._id === messageId)
      if (msg?.voiceUrl) {
        playVoiceFromUrl(activeChatId, messageId, msg.voiceUrl)
        return
      }

      const res = await voiceApi.textToSpeech({
        chatId: activeChatId,
        messageId,
        text,
        voice,
        culture,
      })
      if (res.error) {
        toastStore.error(`Failed to request text to speech: ${res.error}`)
      }
    },
    async *createImage({ activeChatId, activeCharId }, messageId?: string) {
      const onDone = (image: string) => handleImage(activeChatId, image)
      yield { waiting: { chatId: activeChatId, mode: 'send', characterId: activeCharId } }

      const res = await imageApi.generateImage({ messageId, onDone })
      if (res.error) {
        yield { waiting: undefined }
        toastStore.error(`Failed to request image: ${res.error}`)
      }
    },
  }
})

/**
 *
 * @param chatId
 * @param image base64 encoded image or image url
 */
async function handleImage(chatId: string, image: string) {
  const { msgs, activeCharId, images, imagesSaved } = msgStore.getState()

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

async function playVoiceFromUrl(chatId: string, messageId: string, url: string) {
  const user = userStore.getState().user
  if (user?.texttospeech?.enabled === false) return
  if (chatId != msgStore.getState().activeChatId) {
    msgStore.setState({ speaking: undefined })
    return
  }
  try {
    const audio = await createSpeech({ url })
    audio.addEventListener('error', (e) => {
      console.error(e)
      toastStore.error(`Error playing URL: ${e.message}`)
      const msgs = msgStore.getState().msgs
      const msg = msgs.find((m) => m._id === messageId)
      if (!msg) return
      const nextMsgs = msgs.map((m) => (m._id === msg._id ? { ...m, voiceUrl: undefined } : m))
      msgStore.setState({
        speaking: undefined,
        msgs: nextMsgs,
      })
    })
    audio.addEventListener('playing', () => {
      const msgs = msgStore.getState().msgs
      const msg = msgs.find((m) => m._id === messageId)
      if (!msg) return
      const nextMsgs = msgs.map((m) => (m._id === msg._id ? { ...m, voiceUrl: url } : m))
      msgStore.setState({
        speaking: { messageId, status: 'playing' },
        msgs: nextMsgs,
      })
    })
    audio.addEventListener('ended', () => {
      msgStore.setState({ speaking: undefined })
    })
    msgStore.setState({ speaking: { messageId, status: 'generating' } })
    audio.play()
  } catch (e: any) {
    toastStore.error(`Error playing URL: ${e.message}`)
    msgStore.setState({ speaking: undefined })
  }
}

async function playVoiceFromBrowser(
  voice: VoiceWebSynthesisSettings,
  text: string,
  culture: string,
  messageId: string
) {
  const user = userStore.getState().user
  if (!user || user?.texttospeech?.enabled === false) return
  const filterAction = user.texttospeech?.filterActions ?? true
  const audio = await createSpeech({ voice, text, culture, filterAction })

  audio.addEventListener('error', (e) => {
    toastStore.error(`Error playing web speech: ${e.message}`)
    msgStore.setState({ speaking: undefined })
  })

  audio.addEventListener('playing', () =>
    msgStore.setState({ speaking: { messageId, status: 'playing' } })
  )
  audio.addEventListener('ended', () => msgStore.setState({ speaking: undefined }))

  audio.play()
}

subscribe('message-partial', { partial: 'string', chatId: 'string' }, (body) => {
  const { activeChatId } = msgStore.getState()
  if (body.chatId !== activeChatId) return

  msgStore.setState({ partial: body.partial })
})

subscribe(
  'message-retry',
  {
    messageId: 'string',
    chatId: 'string',
    message: 'string',
    continue: 'boolean?',
    adapter: 'string',
  },
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

    const chat = chatStore.getState().active
    if (chat?.chat._id !== body.chatId) return

    const voice = chat.char.voice
    const { user } = userStore.getState()

    if (body.adapter === 'image' || !voice || !user) return
    if ((user?.texttospeech?.enabled ?? true) && chat.char.userId === user._id) {
      msgStore.textToSpeech(
        body.messageId,
        body.message,
        voice,
        chat.char.culture ?? defaultCulture
      )
    }
  }
)

subscribe(
  'message-created',
  {
    msg: 'any',
    chatId: 'string',
    generate: 'boolean?',
  },
  (body) => {
    const { msgs, activeChatId } = msgStore.getState()
    if (activeChatId !== body.chatId) return
    const msg = body.msg as AppSchema.ChatMessage
    const user = userStore().user

    const speech = getMessageSpeechInfo(msg, user)
    const nextMsgs = msgs.concat(msg)
    // If the message is from a user don't clear the "waiting for response" flags
    if (msg.userId && !body.generate) {
      msgStore.setState({ msgs: nextMsgs, speaking: speech?.speaking })
    } else {
      msgStore.setState({
        msgs: nextMsgs,
        partial: undefined,
        waiting: undefined,
        speaking: speech?.speaking,
      })
    }

    if (!isLoggedIn()) {
      localApi.saveMessages(body.chatId, nextMsgs)
    }

    addMsgToRetries(msg)

    if (msg.userId && msg.userId != user?._id) {
      chatStore.getMemberProfile(body.chatId, msg.userId)
    }

    if (body.msg.adapter === 'image') return
    if (speech) msgStore.textToSpeech(msg._id, msg.msg, speech.voice, speech?.culture)
  }
)

function getMessageSpeechInfo(msg: AppSchema.ChatMessage, user: AppSchema.User | undefined) {
  if (msg.adapter === 'image' || !msg.characterId) return
  const char = chatStore.getState().chatBotMap[msg.characterId]
  if (!char?.voice) return
  if (!user?.texttospeech?.enabled) return
  return {
    voice: char.voice,
    culture: char.culture,
    speaking: char.voice ? ({ messageId: msg._id, status: 'generating' } as const) : undefined,
  }
}

subscribe('image-failed', { chatId: 'string', error: 'string' }, (body) => {
  msgStore.setState({ waiting: undefined })
  toastStore.error(body.error)
})

subscribe('image-generated', { chatId: 'string', image: 'string' }, (body) => {
  handleImage(body.chatId, body.image)
})

subscribe('voice-generating', { chatId: 'string', messageId: 'string' }, (body) => {
  if (msgStore.getState().activeChatId != body.chatId) return
  msgStore.setState({ speaking: { messageId: body.messageId, status: 'generating' } })
})

subscribe('voice-failed', { chatId: 'string', error: 'string' }, (body) => {
  msgStore.setState({ speaking: undefined })
  toastStore.error(body.error)
})

subscribe('voice-generated', { chatId: 'string', messageId: 'string', url: 'string' }, (body) => {
  if (msgStore.getState().speaking?.messageId != body.messageId) return
  playVoiceFromUrl(body.chatId, body.messageId, body.url)
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
    waiting: { chatId: body.chatId, mode: 'retry', characterId: '' },
  })
})

subscribe(
  'message-creating',
  { chatId: 'string', senderId: 'string?', mode: 'string?', characterId: 'string' },
  (body) => {
    const { waiting, activeChatId, retries } = msgStore.getState()
    if (body.chatId !== activeChatId) return

    msgStore.setState({
      waiting: {
        chatId: activeChatId,
        mode: body.mode as any,
        userId: body.senderId,
        characterId: body.characterId,
      },
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

    const msg = body.msg as AppSchema.ChatMessage
    const next = msgs.filter((m) => m._id !== retrying?._id).concat(msg)
    const speech = getMessageSpeechInfo(msg, userStore().user)

    const chats = localApi.loadItem('chats')
    localApi.saveChats(
      localApi.replace(body.chatId, chats, { updatedAt: new Date().toISOString() })
    )
    localApi.saveMessages(body.chatId, next)

    addMsgToRetries(msg)

    msgStore.setState({
      msgs: next,
      retrying: undefined,
      partial: undefined,
      waiting: undefined,
      speaking: speech?.speaking,
    })

    if (speech) msgStore.textToSpeech(msg._id, msg.msg, speech.voice, speech?.culture)
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
