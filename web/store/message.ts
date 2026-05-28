import { AppSchema } from '../../common/types/schema'
import { EVENTS, events } from '../emitter'
import { getAssetUrl, getUtterableText, storage } from '../shared/util'
import { isLoggedIn } from './api'
import { createStore, getStore } from './create'
import { subscribe } from './socket'
import { toastStore } from './toasts'
import { msgsApi } from './data/messages'
import { imageApi } from './data/image'
import { userStore } from './user'
import { localApi } from './data/storage'
import { chatStore } from './chat'
import { eventStore } from './event'
import { findOne, replace } from '/common/util'
import { ChatTree, sortAsc, toChatGraph } from '/common/chat'
import { embedApi } from './embeddings'
import { HordeCheck } from '/common/horde-gen'
import type { MsgAttachment } from '/srv/adapter/type'
import { debug } from '/common/debug'
import { responseStore } from './response'
import { getMessageImagePrompt } from '../shared/hooks'
import { TickHandler } from '/common/prompt'

const SOFT_PAGE_SIZE = 20

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
  // messageHistory: ChatMessageExt[]
  msgs: ChatMessageExt[]
  messageCutoffId: string

  deleting?: boolean

  imgWaiting?: {
    chatId: string
    characterId?: string
    messageId?: string
    signal: AbortController
    pos: number
  }

  nextLoading: boolean
  imagesSaved: boolean
  // speaking: { messageId: string; status: VoiceState } | undefined

  textBeforeGenMore: string | undefined
  queue: Array<{ chatId: string; message: string; mode: SendModes }>
  // cache: Record<string, AppSchema.ChatMessage>
  canImageCaption: boolean

  /**
   * Ephemeral image messages
   *
   * These will be 'inserted' into chats by 'createdAt' timestamp
   */
  // images: Record<ChatId, AppSchema.ChatMessage[]>

  /** Attachments, mapped by Chat ID  */
  attachments: Record<string, MsgAttachment[]>
  graph: {
    tree: ChatTree
    root: string
  }
  metadata?: AppSchema.ChatMessage
}

const initState: MsgState = {
  activeChatId: '',
  activeCharId: '',
  messageCutoffId: '',
  // messageHistory: [],
  msgs: [],
  nextLoading: false,
  imagesSaved: false,
  queue: [],
  textBeforeGenMore: undefined,
  canImageCaption: false,
  attachments: {},
  graph: {
    tree: {},
    root: '',
  },
}

export async function getMessageImages(messageId: string) {
  const cached = await storage
    .getItem(`message-images-${messageId}`)
    .then((res) => (res ? JSON.parse(res) : []))

  return cached as string[]
}

async function addMessageImage(messageId: string, cacheId: string) {
  const prev = await getMessageImages(messageId)
  if (prev.includes(cacheId)) return

  const next = prev.concat(cacheId)
  await storage.setItem(`message-images-${messageId}`, JSON.stringify(next))
  debug('image-cache')(
    'appended %s: %s',
    `message-images-${messageId}`.slice(0, 20) + '...',
    cacheId
  )
  await hydrateMessageImages(messageId)
}

export const msgStore = createStore<MsgState>(
  'messages',
  initState
)(() => {
  embedApi.onCaptionReady(() => {
    msgStore.setState({ canImageCaption: true })
  })

  events.on(EVENTS.loggedOut, () => {
    msgStore.setState(initState)
  })

  events.on(EVENTS.init, (init) => {
    msgStore.setState({ imagesSaved: init.config.imagesSaved })
  })

  events.on(EVENTS.clearMsgs, (chatId: string) => {
    msgStore.setState({ activeChatId: chatId, activeCharId: undefined, msgs: [] })
  })

  events.on(EVENTS.chatClosed, () => {
    msgStore.setState({ activeChatId: undefined, activeCharId: undefined })
  })

  return {
    receiveMessages(
      _,
      opts: {
        chatId: string
        leafId?: string
        characterId: string
        messages: AppSchema.ChatMessage[]
      }
    ) {
      opts.messages.sort(sortAsc)
      const graph = toChatGraph(opts.messages)

      let leaf = opts.leafId || opts.messages.slice(-1)[0]?._id || ''

      // If the leaf has been deleted then the path won't load
      // So, if the leaf doesn't exist, use the most recent message
      if (opts.leafId) {
        const node = graph.tree[opts.leafId]
        if (!node) {
          leaf = opts.messages.slice(-1)[0]?._id || ''
        }
      }

      const cutoff = getNextMessageCutoff(graph.tree, leaf)

      return {
        activeCharId: opts.characterId,
        activeChatId: opts.chatId,
        msgs: opts.messages,
        messageCutoffId: cutoff,
        graph,
      }
    },

    setMetadataMsg(_, msg?: AppSchema.ChatMessage) {
      return { metadata: msg }
    },

    // setAttachment({ attachments }, chatId: string, base64: string) {
    //   return { attachments: { ...attachments, [chatId]: { image: base64 } } }
    // },
    addAttachment({ attachments }, msgId: string, attachment: MsgAttachment[]) {
      const existing = attachments[msgId]
      const newAttachments: MsgAttachment[] = attachment.filter((attach) => {
        if (!existing) return true

        for (const exist of existing) {
          if (exist.image === attach.image) return false
        }

        return true
      })

      if (!newAttachments.length) return

      const next = { ...attachments }
      if (!next[msgId]) {
        next[msgId] = []
      } else {
        next[msgId] = next[msgId].slice()
      }

      next[msgId].push(...newAttachments)
      // events.emit('msg-attachment', next[msgId])
      return { attachments: next }
    },
    removeAttachment({ attachments }, msgId: string, index: number) {
      const next = { ...attachments }

      if (next[msgId]) {
        if (index < 0) {
          next[msgId] = []
        } else {
          const list = next[msgId].toSpliced(index, 1)
          next[msgId] = list
        }
      }

      // events.emit('msg-attachment', next[msgId])
      return { attachments: next }
    },
    async *getNextMessages({ msgs, activeChatId, nextLoading, graph, messageCutoffId }) {
      if (nextLoading) return

      const msg = msgs[0]
      if (!msg || msg.first) return

      const nextCutoff = getNextMessageCutoff(graph.tree, messageCutoffId)
      return { messageCutoffId: nextCutoff }
    },

    async *softEditMessageParent(
      { msgs, graph },
      msgId: string,
      update: Partial<AppSchema.ChatMessage>,
      onSuccess?: Function
    ) {
      const prev = graph.tree[msgId]
      if (!prev) return toastStore.error(`Cannot find message`)

      const next = { ...prev.msg, ...update, voiceUrl: undefined }
      applyGraphUpdates({ updates: [next] })
      // updateGraphAndReload(msgId, next)
      onSuccess?.()
    },

    async *editMessageParent(
      { msgs, graph },
      msgId: string,
      update: Partial<AppSchema.ChatMessage>,
      onSuccess?: Function
    ) {
      const prev = graph.tree[msgId]
      if (!prev) return toastStore.error(`Cannot find message`)

      const res = await msgsApi.editMessageProps(prev.msg, update)
      if (res.result) {
        const next = { ...prev.msg, ...update, voiceUrl: undefined }
        applyGraphUpdates({ updates: [next] })
        // updateGraphAndReload(msgId, next)
        onSuccess?.()
      }

      if (res.error) {
        toastStore.error(`Failed to update: ${res.error}`)
      }
    },

    async *editMessageProp(
      { msgs },
      msgId: string,
      update: Partial<AppSchema.ChatMessage>,
      onSuccess?: Function
    ) {
      const prev = findOne(msgId, msgs)
      if (!prev) return toastStore.error(`Cannot find message`)

      const res = await msgsApi.editMessageProps(prev, update)
      if (res.error) {
        toastStore.error(`Failed to update message: ${res.error}`)
      }

      if (res.result) {
        const next = { ...prev, ...update, voiceUrl: undefined }
        updateMessageInState(msgId, next)

        onSuccess?.()
      }
    },

    localEditMessageProp({ msgs }, msgId: string, update: Partial<AppSchema.ChatMessage>) {
      const prev = findOne(msgId, msgs)
      if (!prev) return

      const next = { ...prev, ...update, voiceUrl: undefined }
      const nextMsgs = replace(msgId, msgs, next)
      const nextGraph = toChatGraph(nextMsgs)

      return { msgs: nextMsgs, graph: nextGraph }
    },

    async *removeMessageImage({ msgs }, msgId: string, position: number) {
      const prev = msgs.find((m) => m._id === msgId)
      if (!prev) return toastStore.error(`Cannot find message`)

      const extras = (prev.extras || []).slice()

      // 'image' messages have an image in `.msg` which we treat as `position 0`
      if (prev.adapter === 'image') {
        if (position === 0) {
          if (!extras.length) {
            msgStore.deleteMessages(msgId, true)
            return
          }

          msgStore.editMessageProp(msgId, { msg: extras[0], extras: extras.slice(1) })
          return
        }

        msgStore.editMessageProp(msgId, { extras: extras.toSpliced(position - 1, 1) })
        return
      }

      // non-image messages only have images in `.extras`
      msgStore.editMessageProp(msgId, { extras: extras.toSpliced(position, 1) })
      return
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

      const text = replacement
      const res = await msgsApi.swapMessage(msg, text, retries)
      if (res.error) {
        toastStore.error(`Failed to swap message: ${res.error}`)
      }

      if (res.result) {
        const next = msgs.map((msg) => {
          if (msgId !== msg._id) return msg
          return { ...msg, msg: text, retries }
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

      const replacement = position === 0 ? retries[0] : msg.msg
      // Remove the message at the specified position from the retries array
      if (position !== 0) {
        retries.splice(position - 1, 1)
      } else {
        retries.splice(0, 1)
      }

      const text = replacement
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
      const prev = findOne(msgId, msgs)
      if (!prev) return toastStore.error(`Cannot find message`)

      const res = await msgsApi.editMessage(prev, msg)
      if (res.error) {
        toastStore.error(`Failed to update message: ${res.error}`)
      }
      if (res.result) {
        const nextMsgs = replace(msgId, msgs, { msg, voiceUrl: undefined })
        const graph = toChatGraph(nextMsgs)
        yield {
          msgs: nextMsgs,
          graph,
        }
        onSuccess?.()
      }
    },

    *queue({ queue }, chatId: string, message: string, mode: SendModes) {
      yield { queue: [...queue, { chatId, message, mode }] }
      processQueue()
    },

    async *confirmSwipe({ msgs }, msgId: string, position: number, onSuccess?: Function) {
      const msg = msgs.find((m) => m._id === msgId)
      const replacement = msg?.retries?.[position - 1]
      if (!replacement || msg?.msg === undefined) {
        return toastStore.error(`Cannot confirm swipe: Swipe state is stale`)
      }

      msgStore.swapMessage(msgId, position, onSuccess)
    },

    async *deleteMessages(
      { msgs, activeChatId, graph, deleting },
      fromId: string,
      deleteOne?: boolean
    ) {
      let chatId = activeChatId

      if (!chatId) {
        chatId = msgs[0]?.chatId
      }

      const { details } = chatStore.getState()
      const active = details[chatId]?.chat

      if (!active) return
      const currentLeafId = active.treeLeafId || ''

      if (deleting) {
        return
      }

      const fromMsg = graph.tree[fromId]
      if (!fromMsg) {
        return toastStore.error(`Cannot delete message: Message not found`)
      }

      yield { deleting: true }

      const changes = getDeletingIds(fromId, !!deleteOne)

      if (fromMsg.msg.parent) {
        chatStore.forkChat(fromMsg.msg.parent)
      }

      const res = await msgsApi.deleteMessages(chatId, changes.deletes, currentLeafId)

      if (res.error) {
        yield { deleting: false }
        chatStore.forkChat(currentLeafId)
        return toastStore.error(`Failed to delete messages: ${res.error}`)
      }

      const nextLeafId = res.result?.chat.treeLeafId
      if (nextLeafId && graph.tree[nextLeafId]) {
        chatStore.forkChat(nextLeafId)
      }

      applyGraphUpdates({ updates: res.result?.messages, deletes: changes.deletes })

      yield { deleting: false }
    },

    async *createImage(
      { msgs, activeChatId, activeCharId, imgWaiting },
      opts: {
        sourceMsgId?: string
        append?: boolean
        prompt?: string
        onImage?: (image: string) => void
        onError?: (error: string) => void
        onPrompt?: (prompt: string) => void
        onTick?: TickHandler
      }
    ) {
      if (imgWaiting) return

      const messageId = opts.sourceMsgId || msgs.slice(-1)[0]._id
      const messageImagePromt =
        messageId && !opts.prompt ? getMessageImagePrompt(messageId) : undefined

      yield {
        hordeStatus: undefined,
        imgWaiting: {
          chatId: activeChatId,
          characterId: activeCharId,
          pos: 1,
          messageId,
          signal: new AbortController(),
        },
      }

      const res = await imageApi.generateImage(
        {
          messageId,
          chatId: activeChatId,
          prompt: opts.prompt || messageImagePromt,
          append: opts.append,
          source: 'summary',
        },
        {
          onTick: opts.onTick,
          onSummary: async (summary) => {
            const { imgWaiting } = msgStore.getState()
            const next = (imgWaiting?.pos || 1) + 1
            msgStore.setState({ imgWaiting: { ...imgWaiting!, pos: next } })

            if (!opts.prompt) {
              await msgStore.editMessageProp(messageId, { imagePrompt: summary })
            }

            opts.onPrompt?.(summary)
          },
        }
      )

      if (res.result?.content) {
        await handleImage({
          chatId: activeChatId,
          image: res.result.content,
          messageId,
          requestId: res.result.requestId,
        })

        opts.onImage?.(res.result.content)
      }

      if (res.error) {
        yield { imgWaiting: undefined }
        console.log('[wait] create-img err')

        if (opts.onError) {
          opts.onError(res.error)
          return
        }

        toastStore.error(`[Image Generation]: ${res.error}`)
      }
    },
  }
})

function processQueue() {
  const state = msgStore.getState()
  const queue = state.queue
  if (!queue.length) return

  const first = queue[0]
  const remaining = queue.slice(1)
  msgStore.setState({ queue: remaining })

  getStore('responses').send({
    chatId: first.chatId,
    msg: first.message,
    mode: first.mode,
    onSuccess: () => processQueue(),
  })
}

/**
 *
 * @param chatId
 * @param image base64 encoded image or image url
 */
async function handleImage(body: {
  chatId: string
  image: string
  messageId: string
  requestId: string
}) {
  let { chatId, image, messageId, requestId } = body
  if (!messageId) return

  const { msgs, imagesSaved, activeChatId } = msgStore.getState()

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

  const cacheId = imagesSaved ? '' : `cache:${requestId}`

  if (cacheId) {
    const prev = await storage.getItem(cacheId)
    if (prev) return
    const imageIds = await getMessageImages(messageId)

    imageIds.push(cacheId)

    await storage.setItem(cacheId, image)
    await addMessageImage(messageId, cacheId)
    console.log(`[cache] image cached:`, cacheId)
  }

  const msg = msgs.find((m) => m._id === messageId)
  if (!msg) return

  const extras = (msg.extras || []).slice().concat(cacheId ? cacheId : image)

  updateMessageInState(messageId, { extras })

  if (chatId === activeChatId) {
    console.log('[wait] handle-img')
    msgStore.setState({ imgWaiting: undefined })
  }
}

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

async function onMessageReceived(body: {
  type: string
  msg: any
  chatId: string
  generate?: boolean
  requestId?: string
  retry?: boolean
  json?: any
}) {
  const { msgs, activeChatId, graph, attachments } = msgStore.getState()
  if (activeChatId !== body.chatId) return

  const msg = body.msg as AppSchema.ChatMessage
  const user = userStore.getState().user

  const existing = graph.tree[msg._id]

  const isUserMsg = !!msg.userId
  const isRetry = !!existing

  const speech = getMessageSpeechInfo(msg, user)

  const nextMsgs = isRetry
    ? msgs.map((m) => (m._id === msg._id ? msg : m))
    : msgs.filter((m) => m._id !== msg._id).concat(msg)

  const stack = new Error()
  console.log('[wait] msg-rec', body.type, stack.stack)

  msgStore.setState({
    textBeforeGenMore: undefined,
    msgs: nextMsgs,
    graph: toChatGraph(nextMsgs),
  })

  // If the message is from a user don't clear the "waiting for response" flags
  if (isUserMsg && !body.generate) {
    msgStore.setState({ msgs: nextMsgs })
    getStore('responses').setState({ speaking: speech?.speaking })
  } else {
    msgStore.setState({ msgs: nextMsgs })
    debug('waiting')('msg-received:not-user-msg or no-generate')
    getStore('responses').setState({ speaking: speech?.speaking })
  }

  const chatAttachments = attachments[body.chatId]
  if (isUserMsg && chatAttachments?.length && body.msg._id) {
    msgStore.removeAttachment(body.chatId, -1)
    msgStore.addAttachment(body.msg._id, chatAttachments)
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
    const parsed = getUtterableText(msg.msg)
    if (parsed?.content)
      getStore('responses').textToSpeech(msg._id, parsed.content, speech.voice, speech?.culture)
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

  const { details, lastChatId } = chatStore.getState()
  const active = details[lastChatId]

  eventStore.onCharacterMessageReceived(active?.chat!, messagesSinceLastEvent)
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
  console.log('[wait] img-failed')
  msgStore.setState({ imgWaiting: undefined })
  toastStore.error(body.error)
})

subscribe(
  'image-generated',
  { chatId: 'string', image: 'string', messageId: 'string?', requestId: 'string' },
  (body) => {
    if (!body.messageId) return
    handleImage({
      chatId: body.chatId,
      image: body.image,
      messageId: body.messageId,
      requestId: body.requestId,
    })
  }
)

subscribe(['message-error', 'inference-error'], { error: 'any', chatId: 'string' }, (body) => {
  const { activeChatId } = msgStore.getState()
  const { waiting } = getStore('responses').getState()

  if (activeChatId !== body.chatId) return
  if (!waiting) return

  if (body.error === 'inference cancelled by user') {
    /** intentional noop */
    // toastStore.warn(`Message cancelled`)
  } else {
    toastStore.error(`Failed to generate response: ${body.error}`)
  }

  debug('waiting')('subscription:on-error')
  responseStore.setState({ partial: undefined, waiting: undefined, retrying: undefined })
})

subscribe('messages-deleted', { ids: ['string'] }, (body) => {
  const ids = new Set(body.ids)
  const { msgs } = msgStore.getState()

  // @TODO 27-May:

  const nextMsgs = msgs.filter((msg) => !ids.has(msg._id))
  const newGraph = toChatGraph(nextMsgs)
  msgStore.setState({
    msgs: nextMsgs,
    graph: newGraph,
  })
})

subscribe(
  'messaged-deleted-v2',
  {
    updates: { chat: 'any?', messages: [{ _id: 'string', parent: 'string?' }] },
    deletes: ['string?'],
  },
  (body) => {
    applyGraphUpdates({ updates: body.updates.messages, deletes: body.deletes })
  }
)

const updateMsgSub = (body: {
  type: string
  chatId: string
  messageId: string

  imagePrompt?: string
  message?: string
  retries?: string[]
  actions: any
  msg?: string
  parent?: string
  extras?: string[]
  json?: any
  invisible?: any
}) => {
  debug('edit')('updating %s', body.messageId)
  const { msgs } = msgStore.getState()
  const prev = findOne(body.messageId, msgs)

  if (!prev) return

  const next: ChatMessageExt = { ...prev }

  for (const [key, value] of Object.entries(body)) {
    const prop = key as keyof ChatMessageExt
    if (key === 'type' || key === 'chatId' || key === 'messageId') continue
    if (key === 'message') {
      next.msg = value
      continue
    }

    next[prop] = value as any
  }

  const nextMsgs = replace(body.messageId, msgs, next)
  const nextGraph = toChatGraph(nextMsgs)

  msgStore.setState({
    msgs: nextMsgs,
    graph: nextGraph,
  })
}

subscribe('message-parents', { chatId: 'string', parents: 'any' }, (body) => {
  updateMsgParents(body.chatId, body.parents)
})

function updateMsgParents(chatId: string, parents: Record<string, string>, deleteIds?: string[]) {
  const { msgs, activeChatId } = msgStore.getState()
  if (activeChatId !== chatId) return

  let modified = false

  const deleteSet = new Set(deleteIds || [])
  const nextMsgs = msgs
    .filter((m) => !deleteSet.has(m._id))
    .map((msg) => {
      if (!parents[msg._id]) return msg
      if (msg.parent !== parents[msg._id]) {
        modified = true
      }
      return { ...msg, parent: parents[msg._id] }
    })

  // The caller will immediately update the tree when deleting messages
  // This prevents this function running twice due to the 'message-parents' subscription
  if (!modified && !deleteIds) {
    return
  }

  const newGraph = toChatGraph(nextMsgs)

  msgStore.setState({
    msgs: nextMsgs,
    graph: newGraph,
  })
}

subscribe(
  'message-edited',
  {
    chatId: 'string',
    messageId: 'string',

    message: 'string?',
    msg: 'string?',
    imagePrompt: 'string?',
    invsibie: 'any?',
    json: 'any?',
    actions: 'any?',
    extras: ['string?'],
    retries: ['string?'],
  },
  updateMsgSub
)

subscribe(
  'message-swapped',
  {
    chatId: 'string',
    messageId: 'string',
    message: 'string?',
    imagePrompt: 'string?',
    actions: 'any?',
    extras: ['string?'],
    retries: ['string?'],
  },
  updateMsgSub
)

subscribe('message-horde-eta', { eta: 'number', queue: 'number' }, (body) => {
  toastStore.normal(`Queue: ${body.queue}`)
})

subscribe('horde-status', { status: 'any' }, (body) => {
  const waiting = msgStore.getState().imgWaiting

  if (!waiting?.pos) return
  msgStore.setState({ hordeStatus: body.status })
})

export async function hydrateMessageImages(messageId: string) {
  if (!messageId) return

  const { msgs } = msgStore.getState()
  const curr = findOne(messageId, msgs)

  if (!curr) return

  const cached = await getMessageImages(messageId)
  updateMessageInState(messageId, { extras: cached })

  // Case 1. Initial load or first image
  // if (!curr.extras?.length) {
  //   next.push(...cached)
  // }

  // Case 2.
}

function applyGraphUpdates(params: {
  updates?: Array<{ _id: string } & Partial<AppSchema.ChatMessage>>
  deletes?: string[]
}) {
  const { msgs } = msgStore.getState()

  const updateMap: Record<string, { _id: string } & Partial<AppSchema.ChatMessage>> = {}
  if (params.updates) {
    for (const { _id, ...update } of params.updates) {
      updateMap[_id] = { _id, ...update }
    }
  }

  const deletes = new Set(params.deletes || [])
  const nextMsgs = msgs
    .filter((m) => !deletes.has(m._id))
    .map((m) => {
      if (!updateMap[m._id]) return m
      return { ...m, ...updateMap[m._id] }
    })
  const newGraph = toChatGraph(nextMsgs)

  msgStore.setState({
    graph: newGraph,
    msgs: nextMsgs,
  })
}

function updateMessageInState(messageId: string, updates: Partial<AppSchema.ChatMessage>) {
  const { msgs } = msgStore.getState()

  const main = findOne(messageId, msgs)

  if (!main) return

  const nextMsg = { ...main, ...updates }
  const next = replace(messageId, msgs, nextMsg)
  const newGraph = toChatGraph(next)

  msgStore.setState({ msgs: next, graph: { tree: newGraph.tree, root: newGraph.root } })
}

function getDeletingIds(fromId: string, deleteOne: boolean) {
  const state = msgStore.getState()
  const graph = toChatGraph(state.msgs.slice())

  const from = graph.tree[fromId]

  if (!from) {
    throw new Error(`Could not locate message to delete`)
  }

  if (deleteOne) {
    return { deletes: [fromId] }
  }

  const deletes = [fromId].concat(getChildren(graph.tree, fromId))

  return { deletes }
}

function getChildren(graph: ChatTree, nodeId: string, prev: string[] = []) {
  const target = graph[nodeId]
  if (!target) return prev

  for (const child in target.children) {
    prev.push(child)

    getChildren(graph, child, prev)
  }

  return prev
}

function getNextMessageCutoff(tree: ChatTree, currentCutoffId: string) {
  let current = tree[currentCutoffId]

  if (!current) {
    return currentCutoffId
  }

  if (!current.msg.parent) return currentCutoffId

  for (let i = 0; i < SOFT_PAGE_SIZE; i++) {
    const parent = tree[current.msg.parent!]
    if (parent) {
      current = parent
      continue
    }

    break
  }

  return current.msg._id
}
