import { v4 } from 'uuid'
import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { createDebounce, getAssetUrl } from '../shared/util'
import { isLoggedIn } from './api'
import { createStore, getStore } from './create'
import { getImageData } from './data/chars'
import { subscribe } from './socket'
import { toastStore } from './toasts'
import { GenerateOpts, msgsApi } from './data/messages'
import { imageApi } from './data/image'
import { userStore } from './user'
import { localApi } from './data/storage'
import { chatStore } from './chat'
import { voiceApi } from './data/voice'
import { VoiceSettings, VoiceWebSynthesisSettings } from '../../common/types/texttospeech-schema'
import { defaultCulture } from '../shared/CultureCodes'
import { createSpeech, isNativeSpeechSupported, stopSpeech } from '../shared/Audio/speech'
import { eventStore } from './event'
import { findOne, replace } from '/common/util'
import { sortAsc } from '/common/chat'
import { embedApi } from './embeddings'

const SOFT_PAGE_SIZE = 20

type ChatId = string

export type VoiceState = 'generating' | 'playing'

type SendModes =
  | 'send'
  | 'ooc'
  | 'send-event:world'
  | 'send-event:character'
  | 'send-event:hidden'
  | 'send-event:ooc'
  | 'retry'
  | 'self'
  | 'send-noreply'

export type ChatMessageExt = AppSchema.ChatMessage & { voiceUrl?: string }

export type MsgState = {
  activeChatId: string
  activeCharId: string
  messageHistory: ChatMessageExt[]
  msgs: ChatMessageExt[]
  partial?: string
  retrying?: AppSchema.ChatMessage
  waiting?: { chatId: string; mode?: GenerateOpts['kind']; userId?: string; characterId: string }
  nextLoading: boolean
  imagesSaved: boolean
  speaking: { messageId: string; status: VoiceState } | undefined
  lastInference?: {
    requestId: string
    chatId: string
    messageId: string
    characterId: string
    text: string
  }
  textBeforeGenMore: string | undefined
  queue: Array<{ chatId: string; message: string; mode: SendModes }>
  // cache: Record<string, AppSchema.ChatMessage>
  branch?: AppSchema.ChatMessage[]
  canImageCaption: boolean

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
  messageHistory: [],
  msgs: [],
  images: {},
  nextLoading: false,
  imagesSaved: false,
  waiting: undefined,
  partial: undefined,
  retrying: undefined,
  speaking: undefined,
  queue: [],
  textBeforeGenMore: undefined,
  canImageCaption: false,
}

export const msgStore = createStore<MsgState>(
  'messages',
  initState
)(() => {
  embedApi.onCaptionReady(() => {
    msgStore.setState({ canImageCaption: true })
  })

  events.on('logged-out', () => {
    msgStore.setState(initState)
  })

  events.on(EVENTS.init, (init) => {
    msgStore.setState({ imagesSaved: init.config.imagesSaved })
  })

  events.on(EVENTS.clearMsgs, (chatId: string) => {
    msgStore.setState({ activeChatId: chatId, activeCharId: undefined, msgs: [] })
  })

  events.on(
    EVENTS.receiveMsgs,
    (data: { characterId: string; chatId: string; messages: AppSchema.ChatMessage[] }) => {
      data.messages.sort(sortAsc)
      const trailing = data.messages.splice(-SOFT_PAGE_SIZE)
      msgStore.setState({
        activeCharId: data.characterId,
        activeChatId: data.chatId,
        messageHistory: data.messages,
        msgs: trailing,
      })

      embedApi.embedChat(data.chatId, data.messages)
    }
  )

  return {
    async *getNextMessages({ msgs, messageHistory, activeChatId, nextLoading }) {
      if (nextLoading) return

      const msg = msgs[0]
      if (!msg || msg.first) return

      yield { nextLoading: true }

      if (messageHistory.length) {
        const nextHistory = messageHistory.slice()
        const trailing = nextHistory.splice(-SOFT_PAGE_SIZE)
        yield { nextLoading: false, msgs: trailing.concat(msgs), messageHistory: nextHistory }
        return
      }

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

    async *editMessageProp(
      { msgs },
      msgId: string,
      update: Partial<AppSchema.ChatMessage>,
      onSuccess?: Function
    ) {
      const prev = msgs.find((m) => m._id === msgId)
      if (!prev) return toastStore.error(`Cannot find message`)

      const res = await msgsApi.editMessageProps(prev, update)
      if (res.error) {
        toastStore.error(`Failed to update message: ${res.error}`)
      }

      if (res.result) {
        yield {
          msgs: msgs.map((m) => (m._id === msgId ? { ...m, ...update, voiceUrl: undefined } : m)),
        }
        onSuccess?.()
      }
    },

    async *removeMessageImage({ msgs }, msgId: string, position: number) {
      const prev = msgs.find((m) => m._id === msgId)
      if (!prev) return toastStore.error(`Cannot find message`)

      const extras = (prev.extras || []).slice()

      if (position === 0) {
        if (!extras.length) {
          msgStore.deleteMessages(msgId, true)
          return
        }

        const msg = extras.shift()
        msgStore.editMessageProp(msgId, { msg, extras })
        return
      }

      extras.splice(position - 1, 1)
      msgStore.editMessageProp(msgId, { extras })
    },

    async *swapMessage({ msgs }, msgId: string, position: number, onSuccess?: Function) {
      const msg = msgs.find((m) => m._id === msgId)

      if (!msg) return toastStore.error(`Cannot find message`)
      if (!msg.retries?.length) {
        return toastStore.error(`Message does not contain any swipes`)
      }

      const original = msg.msg
      const replacement = msg.retries[position - 1]

      if (!replacement) {
        return toastStore.error(`Cannot swap messages: Replacement message not found`)
      }

      const retries = msg.retries.slice()
      retries[position - 1] = original

      const res = await msgsApi.swapMessage(msg, replacement, retries)
      if (res.error) {
        toastStore.error(`Failed to swap message: ${res.error}`)
      }

      if (res.result) {
        const next = msgs.map((msg) => {
          if (msgId !== msg._id) return msg
          return { ...msg, msg: replacement, retries }
        })
        yield { msgs: next }
        onSuccess?.()
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
        yield { msgs: msgs.map((m) => (m._id === msgId ? { ...m, msg, voiceUrl: undefined } : m)) }
        onSuccess?.()
      }
    },

    clearLastInference() {
      return { lastInference: undefined }
    },

    async *continuation(
      { msgs },
      chatId: string,
      onSuccess?: () => void,
      retryLatestGenMoreOutput?: boolean
    ) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      const [_, replace] = msgs.slice(-2)
      yield {
        partial: '',
        waiting: {
          chatId,
          mode: 'continue',
          characterId: replace.characterId!,
        },
        retrying: replace,
      }

      const msgState = msgStore.getState()
      const textBeforeGenMore = retryLatestGenMoreOutput
        ? msgState.textBeforeGenMore ?? replace.msg
        : replace.msg
      const res = await msgsApi.generateResponse({
        kind: 'continue',
        retry: retryLatestGenMoreOutput,
      })

      if (res.error) {
        toastStore.error(`(Continue) Generation request failed: ${res.error}`)
        yield { partial: undefined, waiting: undefined }
      }

      if (res.result) {
        msgStore.setState({ textBeforeGenMore })
        onSuccess?.()
      }
    },

    async *request(_, chatId: string, characterId: string, onSuccess?: () => void) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }
      yield { partial: undefined, waiting: { chatId, mode: 'request', characterId } }

      const res = await msgsApi.generateResponse({ kind: 'request', characterId })

      if (res.error) {
        toastStore.error(`(Bot) Generation request failed: ${res.error}`)
        yield { partial: undefined, waiting: undefined }
      }

      if (res.result) onSuccess?.()
    },

    async *retry(
      { msgs, activeCharId },
      chatId: string,
      messageId?: string,
      onSuccess?: () => void
    ) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      if (msgs.length === 0) {
        msgStore.request(chatId, activeCharId, onSuccess)
        return
      }

      const msg = messageId ? msgs.find((msg) => msg._id === messageId)! : msgs[msgs.length - 1]
      const replace = msg?.userId ? undefined : { ...msg, voiceUrl: undefined }
      const characterId = replace?.characterId || activeCharId
      yield {
        partial: '',
        waiting: { chatId, mode: 'retry', characterId },
        retrying: replace,
      }

      const res = await msgsApi.generateResponse({ kind: 'retry', messageId })

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
        toastStore.error('Cannot resend message: Message not found')
        return
      }

      const msg = msgs[msgIndex]
      msgStore.send(chatId, msg.msg, 'retry', undefined)
    },

    async *selfGenerate({ activeChatId }) {
      msgStore.send(activeChatId, '', 'self', undefined)
    },

    *queue({ queue }, chatId: string, message: string, mode: SendModes) {
      yield { queue: [...queue, { chatId, message, mode }] }
      processQueue()
    },

    async *send(
      { activeCharId, waiting },
      chatId: string,
      message: string,
      mode: SendModes,
      onSuccess?: () => void
    ) {
      if (waiting) return
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
          res = await msgsApi.generateResponse({ kind: mode })
          break

        case 'send':
        case 'ooc':
        case 'send-event:world':
        case 'send-event:character':
        case 'send-event:hidden':
        case 'send-noreply':
        case 'send-event:ooc':
          res = await msgsApi.generateResponse({ kind: mode, text: message })
          if ('result' in res && !res.result.generating) {
            yield { partial: undefined, waiting: undefined }
          }
          break

        default:
          res = { error: `Unknown mode ${mode}`, result: undefined }
      }

      if (res.error) {
        toastStore.error(`(Send) Generation request failed: ${res?.error ?? 'Unknown error'}`)
        yield { partial: undefined, waiting: undefined }
      }

      if (res.result) {
        onSuccess?.()
      }
    },
    async *confirmSwipe({ msgs }, msgId: string, position: number, onSuccess?: Function) {
      const msg = msgs.find((m) => m._id === msgId)
      const replacement = msg?.retries?.[position - 1]
      if (!replacement || !msg?.msg) {
        return toastStore.error(`Cannot confirm swipe: Swipe state is stale`)
      }

      msgStore.swapMessage(msgId, position, onSuccess)
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
      stopSpeech()
      return { speaking: undefined }
    },
    async *textToSpeech(
      { activeChatId, msgs },
      messageId: string,
      text: string,
      voice: VoiceSettings,
      culture?: string
    ) {
      stopSpeech()

      if (!voice.service) {
        yield { speaking: undefined }
        return
      }

      yield { speaking: { messageId, status: 'generating' } }

      if (voice.service === 'webspeechsynthesis') {
        if (!isNativeSpeechSupported()) {
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
        playVoiceFromUrl(activeChatId, messageId, msg.voiceUrl, voice.rate)
        return
      }

      const res = await voiceApi.chatTextToSpeech({
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
    async *createImage(
      { msgs, activeChatId, activeCharId, waiting },
      messageId?: string,
      append?: boolean
    ) {
      if (waiting) return

      const onDone = (image: string) => handleImage(activeChatId, image)
      yield { waiting: { chatId: activeChatId, mode: 'send', characterId: activeCharId } }

      const prev = messageId ? msgs.find((msg) => msg._id === messageId) : undefined
      const res = await imageApi.generateImage({
        messageId,
        prompt: prev?.imagePrompt,
        append,
        onDone,
        source: 'summary',
      })
      if (res.error) {
        yield { waiting: undefined }
        toastStore.error(`Failed to request image: ${res.error}`)
      }
    },
  }
})

const [debouncedEmbed] = createDebounce((chatId: string, history: any) => {
  embedApi.embedChat(chatId, history)
}, 250)

msgStore.subscribe((state) => {
  if (state.partial) return
  if (!state.activeChatId) return
  if (!state.msgs.length) return
  debouncedEmbed(state.activeChatId, state.messageHistory.concat(state.msgs))
})

function processQueue() {
  const state = msgStore.getState()
  const queue = state.queue
  if (!queue.length) return

  const first = queue[0]
  const remaining = queue.slice(1)
  msgStore.setState({ queue: remaining })

  msgStore.send(first.chatId, first.message, first.mode, () => processQueue())
}

/**
 *
 * @param chatId
 * @param image base64 encoded image or image url
 */
async function handleImage(chatId: string, image: string, messageId?: string) {
  const { msgs, activeCharId, images, imagesSaved, activeChatId } = msgStore.getState()

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
    image = image.startsWith('data') ? image : `data:image/png;base64,${image}`
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
    retries: [],
  }

  chatImages.push(newMsg)

  if (chatId === activeChatId) {
    const nextMsgs = msgs.concat(newMsg)
    msgStore.setState({
      msgs: nextMsgs,
      waiting: undefined,
      images: { ...images, [chatId]: chatImages },
    })
  }
}

async function playVoiceFromUrl(
  chatId: string,
  messageId: string,
  url: string,
  rate: number | undefined
) {
  if (chatId != msgStore.getState().activeChatId) {
    msgStore.setState({ speaking: undefined })
    return
  }
  try {
    const audio = await createSpeech({ kind: 'remote', url })

    audio.addEventListener('error', (e) => {
      console.error(e)
      toastStore.error(`Error playing URL: ${e.message}`)
      const msgs = msgStore.getState().msgs
      const msg = msgs.find((m) => m._id === messageId)
      if (!msg) return
      const nextMsgs = msgs.map((m) => (m._id === msg._id ? { ...m, voiceUrl: undefined } : m))
      msgStore.setState({ speaking: undefined, msgs: nextMsgs })
    })
    audio.addEventListener('playing', () => {
      const msgs = msgStore.getState().msgs
      const msg = msgs.find((m) => m._id === messageId)
      if (!msg) return
      const nextMsgs = msgs.map((m) => (m._id === msg._id ? { ...m, voiceUrl: url } : m))
      msgStore.setState({ speaking: { messageId, status: 'playing' }, msgs: nextMsgs })
    })
    audio.addEventListener('ended', () => {
      msgStore.setState({ speaking: undefined })
    })
    msgStore.setState({ speaking: { messageId, status: 'generating' } })
    audio.play(rate)
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
  const audio = await createSpeech({ kind: 'native', voice, text, culture, filterAction })

  audio.addEventListener('error', (e) => {
    toastStore.error(`Error playing web speech: ${e.message}`)
    msgStore.setState({ speaking: undefined })
  })

  audio.addEventListener('playing', () =>
    msgStore.setState({ speaking: { messageId, status: 'playing' } })
  )
  audio.addEventListener('ended', () => msgStore.setState({ speaking: undefined }))

  audio.play(voice.rate)
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
    requestId: 'string?',
    chatId: 'string',
    message: 'string',
    continue: 'boolean?',
    adapter: 'string',
    extras: ['string?'],
    meta: 'any?',
    retries: ['string?'],
    actions: [{ emote: 'string', action: 'string' }, '?'],
  },
  async (body) => {
    const { retrying, msgs, activeChatId } = msgStore.getState()
    const { characters } = getStore('character').getState()
    const { active } = getStore('chat').getState()

    const { user } = getStore('user').getState()

    if (activeChatId !== body.chatId || !active) return

    const prev = msgs.find((msg) => msg._id === body.messageId)
    const char = prev?.characterId ? characters.map[prev?.characterId] : undefined

    msgStore.setState({
      partial: undefined,
      retrying: undefined,
      waiting: undefined,
      lastInference: {
        requestId: body.requestId!,
        text: body.message,
        characterId: char?._id!,
        chatId: body.chatId,
        messageId: body.messageId,
      },
    })

    await Promise.resolve()

    const nextMsg = {
      msg: body.message,
      actions: body.actions,
      voiceUrl: undefined,
      meta: body.meta,
      extras: body.extras || prev?.extras,
      retries: body.retries,
    }

    if (retrying?._id === body.messageId) {
      const next = msgs.map((msg) => (msg._id === body.messageId ? { ...msg, ...nextMsg } : msg))
      msgStore.setState({ msgs: next })
    } else {
      if (activeChatId !== body.chatId || !prev) return
      msgStore.setState({
        msgs: msgs.map((msg) => (msg._id === body.messageId ? { ...msg, ...nextMsg } : msg)),
      })
    }

    if (active.chat._id !== body.chatId || !prev || !char) return

    const voice = char.voice

    if (body.adapter === 'image' || !voice || !user) return
    const canSpeak = (user?.texttospeech?.enabled ?? true) && !char.voiceDisabled
    if (canSpeak && active.char.userId === user._id) {
      msgStore.textToSpeech(body.messageId, body.message, voice, char.culture ?? defaultCulture)
    }
  }
)

subscribe(
  'message-created',
  {
    msg: 'any',
    chatId: 'string',
    generate: 'boolean?',
    requestId: 'string?',
    actions: [{ emote: 'string', action: 'string' }, '?'],
  } as const,
  async (body) => {
    const { msgs, activeChatId, messageHistory } = msgStore.getState()
    if (activeChatId !== body.chatId) return

    const msg = body.msg as AppSchema.ChatMessage
    const user = userStore.getState().user

    const speech = getMessageSpeechInfo(msg, user)
    const nextMsgs = msgs.concat(msg)

    const isUserMsg = !!msg.userId

    msgStore.setState({
      lastInference: {
        requestId: body.requestId!,
        text: body.msg.msg,
        characterId: body.msg.characterId,
        chatId: body.chatId,
        messageId: body.msg._id,
      },
      textBeforeGenMore: undefined,
    })

    // If the message is from a user don't clear the "waiting for response" flags
    if (isUserMsg && !body.generate) {
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
      await localApi.saveMessages(body.chatId, messageHistory.concat(nextMsgs))
    }

    if (msg.userId && msg.userId != user?._id) {
      chatStore.getMemberProfile(body.chatId, msg.userId)
    }

    if (body.msg.adapter === 'image') return

    if (speech && !isUserMsg) {
      msgStore.textToSpeech(msg._id, msg.msg, speech.voice, speech?.culture)
    }

    onCharacterMessageReceived(msg)
  }
)

function onCharacterMessageReceived(msg: AppSchema.ChatMessage) {
  if (!msg.characterId || msg.event || msg.ooc) return
  const { msgs } = msgStore.getState()
  // TODO: Not that expensive, but it would be nice not to loop every time
  let messagesSinceLastEvent = 0
  for (let i = msgs.length - 1; i >= 0; i--) {
    const msg = msgs[i]
    if (msg.event) break

    if (!msg.event && !msg.userId) {
      messagesSinceLastEvent++
    }
  }

  eventStore.onCharacterMessageReceived(chatStore.getState().active?.chat!, messagesSinceLastEvent)
}

function getMessageSpeechInfo(msg: AppSchema.ChatMessage, user: AppSchema.User | undefined) {
  if (msg.adapter === 'image' || !msg.characterId || msg.userId) return
  const { characters } = getStore('character').getState()
  const char = characters.map[msg.characterId]

  if (!char?.voice) return
  if (!user?.texttospeech?.enabled) return
  if (char.voiceDisabled) return

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

subscribe(
  'image-generated',
  { chatId: 'string', image: 'string', messageId: 'string?' },
  (body) => {
    handleImage(body.chatId, body.image, body.messageId)
  }
)

subscribe('voice-generating', { chatId: 'string', messageId: 'string' }, (body) => {
  const activeChatId = msgStore.getState().activeChatId
  if (activeChatId != body.chatId) return
  const { user } = userStore.getState()
  if (user?.texttospeech?.enabled === false) return
  msgStore.setState({ speaking: { messageId: body.messageId, status: 'generating' } })
})

subscribe('voice-failed', { chatId: 'string', error: 'string' }, (body) => {
  const activeChatId = msgStore.getState().activeChatId
  if (activeChatId != body.chatId) return
  msgStore.setState({ speaking: undefined })
  toastStore.error(body.error)
})

subscribe(
  'voice-generated',
  { chatId: 'string', messageId: 'string', url: 'string', rate: 'number?' },
  (body) => {
    if (msgStore.getState().speaking?.messageId != body.messageId) return
    playVoiceFromUrl(body.chatId, body.messageId, body.url, body.rate)
  }
)

subscribe('message-error', { error: 'any', chatId: 'string' }, (body) => {
  const { msgs } = msgStore.getState()
  toastStore.error(`Failed to generate response: ${body.error}`)

  let nextMsgs = msgs

  msgStore.setState({ partial: undefined, waiting: undefined, msgs: nextMsgs, retrying: undefined })
})

subscribe('message-warning', { warning: 'string' }, (body) => {
  toastStore.warn(body.warning)
})

subscribe('messages-deleted', { ids: ['string'] }, (body) => {
  const ids = new Set(body.ids)
  const { msgs } = msgStore.getState()
  msgStore.setState({ msgs: msgs.filter((msg) => !ids.has(msg._id)) })
})

const updateMsgSub = (body: any) => {
  const { msgs } = msgStore.getState()
  const prev = findOne(body.messageId, msgs)
  const nextMsgs = replace(body.messageId, msgs, {
    imagePrompt: body.imagePrompt || prev?.imagePrompt,
    msg: body.message || prev?.msg,
    retries: body.retries || prev?.retries,
    actions: body.actions || prev?.actions,
    voiceUrl: undefined,
    extras: body.extras || prev?.extras,
  })

  msgStore.setState({ msgs: nextMsgs })
}

subscribe(
  'message-edited',
  {
    messageId: 'string',
    message: 'string?',
    imagePrompt: 'string?',
    actions: 'any?',
    extras: ['string?'],
    retries: ['string?'],
  },
  updateMsgSub
)

subscribe(
  'message-swapped',
  {
    messageId: 'string',
    message: 'string?',
    imagePrompt: 'string?',
    actions: 'any?',
    extras: ['string?'],
    retries: ['string?'],
  },
  updateMsgSub
)

subscribe('message-retrying', { chatId: 'string', messageId: 'string' }, (body) => {
  const { msgs, activeChatId, retrying } = msgStore.getState()

  const replace = msgs.find((msg) => msg._id === body.messageId)

  if (activeChatId !== body.chatId) return
  if (retrying) return
  if (!replace) return

  msgStore.setState({
    partial: '',
    retrying: replace,
    waiting: { chatId: body.chatId, mode: 'retry', characterId: '' },
    lastInference: undefined,
  })
})

subscribe(
  'message-creating',
  { chatId: 'string', senderId: 'string?', mode: 'string?', characterId: 'string' },
  (body) => {
    const { activeChatId } = msgStore.getState()
    if (body.chatId !== activeChatId) return

    msgStore.setState({
      waiting: {
        chatId: activeChatId,
        mode: body.mode as any,
        userId: body.senderId,
        characterId: body.characterId,
      },
      partial: '',
      lastInference: undefined,
    })
  }
)

subscribe('message-horde-eta', { eta: 'number', queue: 'number' }, (body) => {
  toastStore.normal(`Queue: ${body.queue}`)
})

subscribe(
  'guest-message-created',
  { msg: 'any', chatId: 'string', continue: 'boolean?', requestId: 'string?' },
  async (body) => {
    const { messageHistory, msgs, activeChatId, retrying } = msgStore.getState()
    if (activeChatId !== body.chatId) return

    if (retrying) {
      body.msg._id = retrying._id
    }

    const msg = body.msg as AppSchema.ChatMessage
    const next = msgs.filter((m) => m._id !== retrying?._id).concat(msg)
    const speech = getMessageSpeechInfo(msg, userStore.getState().user)

    const chats = await localApi.loadItem('chats')
    await localApi.saveChats(replace(body.chatId, chats, { updatedAt: new Date().toISOString() }))
    await localApi.saveMessages(body.chatId, messageHistory.concat(next))

    msgStore.setState({
      msgs: next,
      retrying: undefined,
      partial: undefined,
      waiting: undefined,
      speaking: speech?.speaking,
      lastInference: {
        requestId: body.requestId!,
        text: body.msg.msg,
        characterId: body.msg.characterId,
        chatId: body.chatId,
        messageId: body.msg._id,
      },
      textBeforeGenMore: undefined,
    })

    if (speech) msgStore.textToSpeech(msg._id, msg.msg, speech.voice, speech?.culture)

    onCharacterMessageReceived(msg)
  }
)
