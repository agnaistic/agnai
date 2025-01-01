import { v4 } from 'uuid'
import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { createDebounce, getAssetUrl } from '../shared/util'
import { isLoggedIn } from './api'
import { createStore, getStore } from './create'
import { publish, subscribe } from './socket'
import { toastStore } from './toasts'
import { msgsApi } from './data/messages'
import { imageApi } from './data/image'
import { userStore } from './user'
import { localApi } from './data/storage'
import { chatStore } from './chat'
import { voiceApi } from './data/voice'
import { VoiceSettings, VoiceWebSynthesisSettings } from '../../common/types/texttospeech-schema'
import { defaultCulture } from '../shared/CultureCodes'
import { createSpeech, isNativeSpeechSupported, stopSpeech } from '../shared/Audio/speech'
import { eventStore } from './event'
import { exclude, findOne, replace } from '/common/util'
import {
  ChatTree,
  removeChatTreeNodes,
  resolveChatPath,
  sortAsc,
  toChatGraph,
  updateChatTreeNode,
} from '/common/chat'
import { embedApi } from './embeddings'
import { JsonField, TickHandler } from '/common/prompt'
import { HordeCheck } from '/common/horde-gen'
import { botGen, GenerateOpts } from './data/bot-generate'

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

export type ChatMessageExt = AppSchema.ChatMessage & { voiceUrl?: string; handle?: string }

export type MsgState = {
  hordeStatus?: HordeCheck
  activeChatId: string
  activeCharId: string
  messageHistory: ChatMessageExt[]
  msgs: ChatMessageExt[]
  partial?: string
  retrying?: AppSchema.ChatMessage
  waiting?: {
    chatId: string
    mode?: GenerateOpts['kind']
    input?: string
    userId?: string
    characterId: string
    messageId?: string
    image?: boolean
  }
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
  canImageCaption: boolean

  /**
   * Ephemeral image messages
   *
   * These will be 'inserted' into chats by 'createdAt' timestamp
   */
  images: Record<ChatId, AppSchema.ChatMessage[]>

  /** Attachments, mapped by Chat ID  */
  attachments: Record<string, { image: string } | undefined>
  graph: {
    tree: ChatTree
    root: string
  }
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
  attachments: {},
  graph: {
    tree: {},
    root: '',
  },
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
    (data: {
      characterId: string
      chatId: string
      leafId?: string
      messages: AppSchema.ChatMessage[]
    }) => {
      data.messages.sort(sortAsc)
      const graph = toChatGraph(data.messages)

      let leaf = data.leafId || data.messages.slice(-1)[0]?._id || ''

      // If the leaf has been deleted then the path won't load
      // So, if the leaf doesn't exist, use the most recent message
      if (data.leafId) {
        const node = graph.tree[data.leafId]
        if (!node) {
          leaf = data.messages.slice(-1)[0]?._id || ''
        }
      }

      const fullPath = resolveChatPath(graph.tree, leaf)
      const recent = fullPath.splice(-SOFT_PAGE_SIZE)

      msgStore.setState({
        activeCharId: data.characterId,
        activeChatId: data.chatId,
        messageHistory: fullPath,
        msgs: recent,
        graph,
      })

      embedApi.embedChat(data.chatId, data.messages)
    }
  )

  return {
    setAttachment({ attachments }, chatId: string, base64: string) {
      return { attachments: { ...attachments, [chatId]: { image: base64 } } }
    },
    removeAttachment({ attachments }, chatId: string) {
      return { attachments: { ...attachments, [chatId]: undefined } }
    },
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

    async *discardSwipe({ msgs }, msgId: string, position: number, onSuccess?: Function) {
      const msg = msgs.find((m) => m._id === msgId)

      if (!msg) return toastStore.error(`Cannot find message`)
      if (!msg.retries?.length) {
        return toastStore.error(`Message does not contain any swipes`)
      }

      const retries = msg.retries.slice()

      if (position !== 0 && !retries[position - 1]) {
        return toastStore.error(`Cannot discard swipe: Swipe not found`)
      }

      const text = position === 0 ? retries[0] : msg.msg
      // Remove the message at the specified position from the retries array
      if (position !== 0) {
        retries.splice(position - 1, 1)
      } else {
        retries.splice(0, 1)
      }

      const res = await msgsApi.swapMessage(msg, text, retries)
      if (res.error) {
        toastStore.error(`Failed to discard message: ${res.error}`)
      }
      if (res.result) {
        const nextMsgs = msgs.map((m) => (m._id === msgId ? { ...m, msg: text, retries } : m))
        yield { msgs: nextMsgs }
        onSuccess?.()
        toastStore.success(`Swipe deleted`, 2)
      }
    },

    async *editMessage({ msgs, graph }, msgId: string, msg: string, onSuccess?: Function) {
      const prev = msgs.find((m) => m._id === msgId)
      if (!prev) return toastStore.error(`Cannot find message`)

      const res = await msgsApi.editMessage(prev, msg)
      if (res.error) {
        toastStore.error(`Failed to update message: ${res.error}`)
      }
      if (res.result) {
        const tree = updateChatTreeNode(graph.tree, { ...prev, msg })
        yield {
          msgs: msgs.map((m) => (m._id === msgId ? { ...m, msg, voiceUrl: undefined } : m)),
          graph: { tree, root: graph.root },
        }
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
      const res = await botGen
        .generate({
          kind: 'continue',
          retry: retryLatestGenMoreOutput,
        })
        .catch((err) => ({ error: err.message, result: undefined }))

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

      const res = await botGen
        .generate({ kind: 'request', characterId })
        .catch((err) => ({ error: err.message, result: undefined }))

      if (res.error) {
        toastStore.error(`(Bot) Generation request failed: ${res.error}`)
        yield { partial: undefined, waiting: undefined }
      }

      if (res.result) onSuccess?.()
    },

    async *fork({ graph: { tree }, msgs, messageHistory }, messageId: 'root' | string) {
      if (messageId === 'root') {
        const first = messageHistory[0] || msgs[0]

        if (!first) {
          toastStore.warn('Could not restart: No root message found')
          return
        }

        messageId = first._id
      }
      const path = resolveChatPath(tree, messageId)
      const page = path.splice(-SOFT_PAGE_SIZE)
      yield { msgs: page, messageHistory: path }
    },

    async *retry({ msgs, activeCharId }, chatId: string, messageId?: string) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      if (msgs.length === 0) {
        msgStore.request(chatId, activeCharId)
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

      const res = await botGen
        .generate({ kind: 'retry', messageId })
        .catch((err) => ({ error: err.message, result: undefined }))

      if (res.error) {
        toastStore.error(`(Retry) Generation request failed: ${res.error}`)
        yield { partial: undefined, waiting: undefined, retrying: undefined }
      }
    },

    async *retrySchema({ msgs, activeCharId }, chatId: string, messageId: string) {
      if (!chatId) {
        toastStore.error('Could not send message: No active chat')
        yield { partial: undefined }
        return
      }

      if (msgs.length === 0) {
        msgStore.request(chatId, activeCharId)
        return
      }

      const msg = msgs.find((msg) => msg._id === messageId)
      if (!msg) {
        toastStore.error(`Could not regenerate: Message not found`)
        yield { partial: undefined }
        return
      }

      const replace = msg?.userId ? undefined : { ...msg, voiceUrl: undefined }
      const characterId = replace?.characterId || activeCharId
      yield {
        partial: '',
        waiting: { chatId, mode: 'retry', characterId },
        retrying: replace,
      }

      const res = await botGen
        .generate({ kind: 'retry', messageId, reschema_prompt: msg.json?.values.response })
        .catch((err) => ({ error: err.message, result: undefined }))

      if (res.error) {
        toastStore.error(`(Retry) Generation request failed: ${res.error}`)
        yield { partial: undefined, waiting: undefined, retrying: undefined }
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

    async *chatQuery({ waiting, activeChatId }, message: string, onTick: TickHandler) {
      if (waiting) return
      if (!activeChatId) {
        toastStore.error('Could not send message: No active chat')
        return
      }

      const res = await botGen
        .generate({ kind: 'chat-query', text: message }, onTick)
        .catch((err) => ({ error: err.message, result: undefined }))

      if (res.error) {
        toastStore.error(`(Send) Generation request failed: ${res?.error ?? 'Unknown error'}`)
      }
    },

    async *chatJson(
      { waiting, activeChatId },
      message: string,
      schema: JsonField[],
      onTick: TickHandler
    ) {
      if (waiting) return
      if (!activeChatId) {
        toastStore.error('Could not send message: No active chat')
        return
      }

      const res = await botGen
        .generate({ kind: 'chat-query', text: message, schema }, onTick)
        .catch((err) => ({ error: err.message, result: undefined }))

      if (res.error) {
        toastStore.error(`(Send) Generation request failed: ${res?.error ?? 'Unknown error'}`)
      }
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
      let input = ''

      switch (mode) {
        case 'self':
        case 'retry':
          res = await botGen
            .generate({ kind: mode })
            .catch((err) => ({ error: err.message, result: undefined }))
          break

        case 'send':
        case 'ooc':
        case 'send-event:world':
        case 'send-event:character':
        case 'send-event:hidden':
        case 'send-noreply':
        case 'send-event:ooc':
          res = await botGen
            .generate({ kind: mode, text: message })
            .catch((err) => ({ error: err.message, result: undefined }))
          if ('result' in res && !res.result.generating) {
            yield { partial: undefined, waiting: undefined }
          }

          input = res.result?.input
          if (input) {
            yield { waiting: { chatId, mode, characterId: activeCharId, input } }
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

        if (res.result.created) {
          onMessageReceived({ msg: res.result.created, chatId: res.result.created.chatId })
        }
      }

      if (res.result?.messageId) {
        yield {
          partial: '',
          waiting: {
            chatId,
            mode,
            characterId: activeCharId,
            messageId: res.result.messageId,
            input,
          },
        }
      }
    },
    async *confirmSwipe({ msgs }, msgId: string, position: number, onSuccess?: Function) {
      const msg = msgs.find((m) => m._id === msgId)
      const replacement = msg?.retries?.[position - 1]
      if (!replacement || msg?.msg === undefined) {
        return toastStore.error(`Cannot confirm swipe: Swipe state is stale`)
      }

      msgStore.swapMessage(msgId, position, onSuccess)
    },
    async deleteMessages({ msgs, activeChatId, graph }, fromId: string, deleteOne?: boolean) {
      const index = msgs.findIndex((m) => m._id === fromId)
      if (index === -1) {
        return toastStore.error(`Cannot delete message: Message not found`)
      }

      const parents: any = {}
      if (deleteOne) {
        const node = graph.tree[fromId]

        if (node) {
          const children = node.children
          for (const child of children) {
            parents[child] = node.msg.parent
          }
        }
      }

      const deleteIds = deleteOne ? [fromId] : msgs.slice(index).map((m) => m._id)
      const removed = new Set(deleteIds)

      const nextMsgs = msgs.filter((msg) => !removed.has(msg._id))

      const leafId = nextMsgs.slice(-1)[0]?._id || ''
      const res = await msgsApi.deleteMessages(activeChatId, deleteIds, leafId, parents)

      if (res.error) {
        return toastStore.error(`Failed to delete messages: ${res.error}`)
      }

      updateMsgParents(activeChatId, parents)
      return {
        msgs: msgs.filter((m) => !deleteIds.includes(m._id)),
      }
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
      { msgs, activeChatId, activeCharId, waiting, graph },
      messageId?: string,
      append?: boolean
    ) {
      if (waiting) return

      const onDone = (image: string) => handleImage(activeChatId, image)
      yield {
        hordeStatus: undefined,
        waiting: { chatId: activeChatId, mode: 'send', characterId: activeCharId, image: true },
      }

      const prev = messageId ? msgs.find((msg) => msg._id === messageId) : undefined
      const parent = prev ? prev.parent : msgs.slice(-1)[0]._id

      const res = await imageApi.generateImage({
        messageId,
        prompt: prev?.imagePrompt,
        append,
        onDone,
        source: 'summary',
        parent,
      })
      if (res.error) {
        yield { waiting: undefined }
        toastStore.error(`Failed to request image: ${res.error}`)
      }
    },
  }
})

setInterval(() => {
  const { waiting, retrying, graph } = msgStore.getState()
  const id = waiting?.messageId || retrying?._id
  if (!id) return
  if (!retrying && graph.tree[id]) return

  publish({ type: 'message-ready', messageId: id, updatedAt: retrying?.updatedAt })
}, 4000)

const [debouncedEmbed] = createDebounce((chatId: string, history: AppSchema.ChatMessage[]) => {
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
      .then(imageApi.getImageData)

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

subscribe(
  'message-partial',
  { partial: 'string', chatId: 'string', kind: 'string?', json: 'any?' },
  (body) => {
    const { activeChatId } = msgStore.getState()
    if (body.chatId !== activeChatId) return

    if (body.kind !== 'chat-query') {
      msgStore.setState({ partial: body.partial })
    }
  }
)

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
    updatedAt: 'string?',
    actions: [{ emote: 'string', action: 'string' }, '?'],
    json: 'any?',
  },
  async (body) => {
    const { retrying, msgs, activeChatId, graph } = msgStore.getState()
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
      updatedAt: body.updatedAt || new Date().toISOString(),
      json: body.json,
    }

    let tree: ChatTree | undefined

    if (retrying?._id === body.messageId) {
      const next = msgs.map((msg) => {
        if (msg._id === body.messageId) {
          const replacement = { ...msg, ...nextMsg }
          tree = updateChatTreeNode(graph.tree, replacement)
          return replacement
        }

        return msg
      })
      msgStore.setState({ msgs: next, graph: { ...graph, tree: tree || graph.tree } })
    } else {
      if (activeChatId !== body.chatId || !prev) return
      const next = msgs.map((msg) => {
        if (msg._id === body.messageId) {
          const replacement = { ...msg, ...nextMsg }
          tree = updateChatTreeNode(graph.tree, replacement)
          return replacement
        }
        return msg
      })
      msgStore.setState({ msgs: next, graph: { ...graph, tree: tree || graph.tree } })
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
    retry: 'boolean?',
    json: 'any?',
  } as const,
  onMessageReceived
)

subscribe(
  'message-completed',
  {
    msg: 'any',
    chatId: 'string',
    generate: 'boolean?',
    requestId: 'string?',
    retry: 'boolean?',
    json: 'any?',
  } as const,
  onMessageReceived
)

async function onMessageReceived(body: {
  msg: any
  chatId: string
  generate?: boolean
  requestId?: string
  retry?: boolean
  json?: any
}) {
  const { msgs, activeChatId, graph } = msgStore.getState()
  if (activeChatId !== body.chatId) return

  const msg = body.msg as AppSchema.ChatMessage
  const user = userStore.getState().user

  if (graph.tree[msg._id]) {
    console.log('message-created: already received')
    return
  }

  const speech = getMessageSpeechInfo(msg, user)

  const isUserMsg = !!msg.userId

  const isRetry = !!graph.tree[msg._id]
  const tree = updateChatTreeNode(graph.tree, msg)
  const nextMsgs = isRetry
    ? msgs.map((m) => (m._id === msg._id ? msg : m))
    : msgs.filter((m) => m._id !== msg._id).concat(msg)

  msgStore.setState({
    lastInference: {
      requestId: body.requestId!,
      text: body.msg.msg,
      characterId: body.msg.characterId,
      chatId: body.chatId,
      messageId: body.msg._id,
    },
    textBeforeGenMore: undefined,
    graph: {
      tree,
      root: graph.root,
    },
  })

  // If the message is from a user don't clear the "waiting for response" flags
  if (isUserMsg && !body.generate) {
    msgStore.setState({ msgs: nextMsgs, speaking: speech?.speaking })
  } else {
    msgStore.setState({
      msgs: nextMsgs,
      partial: undefined,
      waiting: undefined,
      retrying: undefined,
      speaking: speech?.speaking,
    })
  }

  if (!isLoggedIn()) {
    const allMsgs = await localApi.getMessages(body.chatId)
    await localApi.saveChat(body.chatId, { treeLeafId: msg._id })
    await localApi.saveMessages(body.chatId, allMsgs.concat(msg))
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

const queryCallbacks = new Map<string, (response: string) => void>()

subscribe('chat-query', { requestId: 'string', response: 'string' }, (body) => {
  const callback = queryCallbacks.get(body.requestId)
  if (!callback) return

  callback(body.response)
  queryCallbacks.delete(body.requestId)
})

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
  const { activeChatId } = msgStore.getState()

  if (activeChatId !== body.chatId) return
  toastStore.error(`Failed to generate response: ${body.error}`)

  msgStore.setState({ partial: undefined, waiting: undefined, retrying: undefined })
})

subscribe('message-warning', { warning: 'string' }, (body) => {
  toastStore.warn(body.warning)
})

subscribe('messages-deleted', { ids: ['string'] }, (body) => {
  const ids = new Set(body.ids)
  const { msgs, graph } = msgStore.getState()

  msgStore.setState({
    msgs: msgs.filter((msg) => !ids.has(msg._id)),
    graph: {
      tree: removeChatTreeNodes(graph.tree, body.ids),
      root: graph.root,
    },
  })
})

const updateMsgSub = (body: {
  messageId: string
  message?: string
  retries?: string[]
  actions: any
  extras?: string[]
}) => {
  const { msgs, graph } = msgStore.getState()
  const prev = findOne(body.messageId, msgs)

  if (!prev) return

  const next: ChatMessageExt = {
    ...prev,
    msg: body.message || prev?.msg,
    retries: body.retries || prev?.retries,
    actions: body.actions || prev?.actions,
    voiceUrl: undefined,
    extras: body.extras || prev?.extras,
  }
  const nextMsgs = replace(body.messageId, msgs, next)

  msgStore.setState({
    msgs: nextMsgs,
    graph: {
      tree: updateChatTreeNode(graph.tree, next),
      root: graph.root,
    },
  })
}

function updateMsgParents(chatId: string, parents: Record<string, string>, deleteIds?: string[]) {
  const { messageHistory, msgs, activeChatId, graph } = msgStore.getState()
  if (activeChatId !== chatId) return

  let nextHist = messageHistory.slice()
  let nextMsgs = msgs.slice()
  let tree = { ...graph.tree }

  for (const [nodeId, parentId] of Object.entries(parents)) {
    if (typeof parentId !== 'string') continue
    const prev = graph.tree[nodeId]
    if (!prev) continue

    const next = { ...prev.msg, parent: parentId }
    nextHist = replace(nodeId, nextHist, { parent: parentId })
    nextMsgs = replace(nodeId, nextMsgs, { parent: parentId })
    tree = updateChatTreeNode(tree, next)
    tree[next._id].children = new Set(prev.children)

    const parent = tree[parentId]
    if (parent) {
      parent.children.add(next._id)
    }
  }

  if (deleteIds) {
    for (const id of deleteIds) {
      delete tree[id]
    }
  }

  msgStore.setState({
    msgs: nextMsgs,
    messageHistory: nextHist,
    graph: {
      tree,
      root: graph.root,
    },
  })
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
    const { activeChatId, retrying, graph, msgs } = msgStore.getState()
    if (activeChatId !== body.chatId) return

    if (retrying) {
      body.msg._id = retrying._id
    }

    const allMsgs = await localApi.getMessages(body.chatId)

    const msg = body.msg as AppSchema.ChatMessage
    const next = allMsgs.filter((m) => m._id !== retrying?._id && m._id !== msg._id).concat(msg)
    const speech = getMessageSpeechInfo(msg, userStore.getState().user)

    const chats = await localApi.loadItem('chats')
    await localApi.saveChats(
      replace(body.chatId, chats, { updatedAt: new Date().toISOString(), treeLeafId: body.msg._id })
    )
    await localApi.saveMessages(body.chatId, next)

    msgStore.setState({
      msgs: exclude(msgs, [body.msg._id]).concat(msg),
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
      graph: {
        tree: updateChatTreeNode(graph.tree, msg),
        root: graph.root,
      },
    })

    if (speech) msgStore.textToSpeech(msg._id, msg.msg, speech.voice, speech?.culture)

    onCharacterMessageReceived(msg)
  }
)

subscribe('horde-status', { status: 'any' }, (body) => {
  const waiting = msgStore.getState().waiting

  if (!waiting?.image) return
  msgStore.setState({ hordeStatus: body.status })
})
