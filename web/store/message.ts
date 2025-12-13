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
import {
  ChatTree,
  removeChatTreeNodes,
  resolveChatPath,
  sortAsc,
  toChatGraph,
  updateChatTreeNode,
} from '/common/chat'
import { embedApi } from './embeddings'
import { HordeCheck } from '/common/horde-gen'
import type { MsgAttachment } from '/srv/adapter/type'
import { debug } from '/common/debug'
import { responseStore } from './response'
import { getMessageImagePrompt } from '../shared/hooks'

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
  messageHistory: ChatMessageExt[]
  msgs: ChatMessageExt[]
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
  messageHistory: [],
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

      const fullPath = resolveChatPath(graph.tree, leaf)
      const recent = fullPath.splice(-SOFT_PAGE_SIZE)

      return {
        activeCharId: opts.characterId,
        activeChatId: opts.chatId,
        messageHistory: fullPath,
        msgs: recent,
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

    async *softEditMessageParent(
      { msgs, graph },
      msgId: string,
      update: Partial<AppSchema.ChatMessage>,
      onSuccess?: Function
    ) {
      const prev = graph.tree[msgId]
      if (!prev) return toastStore.error(`Cannot find message`)

      const next = { ...prev.msg, ...update, voiceUrl: undefined }
      updateGraphAndReload(msgId, next)
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
        updateGraphAndReload(msgId, next)
        onSuccess?.()
      }

      if (res.error) {
        toastStore.error(`Failed to update: ${res.error}`)
      }
    },

    async *editMessageProp(
      { msgs, graph },
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

    localEditMessageProp({ msgs, graph }, msgId: string, update: Partial<AppSchema.ChatMessage>) {
      const prev = findOne(msgId, msgs)
      if (!prev) return

      const next = { ...prev, ...update, voiceUrl: undefined }
      const nextMsgs = replace(msgId, msgs, next)
      const tree = updateChatTreeNode(graph.tree, next)

      return { msgs: nextMsgs, graph: { ...graph, tree } }
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
      const prev = findOne(msgId, msgs)
      if (!prev) return toastStore.error(`Cannot find message`)

      const res = await msgsApi.editMessage(prev, msg)
      if (res.error) {
        toastStore.error(`Failed to update message: ${res.error}`)
      }
      if (res.result) {
        const nextMsgs = replace(msgId, msgs, { msg, voiceUrl: undefined })
        const tree = updateChatTreeNode(graph.tree, { ...prev, msg })
        yield {
          msgs: nextMsgs,
          graph: { tree, root: graph.root },
        }
        onSuccess?.()
      }
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

      if (deleting) {
        return
      }

      const index = msgs.findIndex((m) => m._id === fromId)
      const fromMsg = graph.tree[fromId]
      if (index === -1 || !fromMsg) {
        return toastStore.error(`Cannot delete message: Message not found`)
      }

      yield { deleting: true }

      const changes = getParentUpdates(graph.tree, fromId, !!deleteOne)
      const removed = new Set(changes.deletes)

      const nextMsgs = msgs.filter((msg) => !removed.has(msg._id))

      const leaf = nextMsgs.slice(-1)[0]
      const leafId = leaf?._id || ''

      const res = await msgsApi.deleteMessages(chatId, changes.deletes, leafId, changes.parents)

      if (res.error) {
        yield { deleting: false }
        return toastStore.error(`Failed to delete messages: ${res.error}`)
      }

      updateMsgParents(activeChatId, changes.parents, changes.deletes)
      yield { deleting: false }
    },

    async *createImage(
      { msgs, activeChatId, activeCharId, imgWaiting },
      opts: { sourceMsgId?: string; append?: boolean; prompt?: string }
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
          onSummary: async (summary) => {
            const { imgWaiting } = msgStore.getState()
            const next = (imgWaiting?.pos || 1) + 1
            msgStore.setState({ imgWaiting: { ...imgWaiting!, pos: next } })

            if (!opts.prompt) {
              await msgStore.editMessageProp(messageId, { imagePrompt: summary })
            }
          },
        }
      )

      if (res.result?.content) {
        handleImage({
          chatId: activeChatId,
          image: res.result.content,
          messageId,
          requestId: res.result.requestId,
        })
      }

      if (res.error) {
        console.log('[wait] create-img err')
        yield { imgWaiting: undefined }
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
  const tree = updateChatTreeNode(graph.tree, msg)

  const nextMsgs = isRetry
    ? msgs.map((m) => (m._id === msg._id ? msg : m))
    : msgs.filter((m) => m._id !== msg._id).concat(msg)

  const stack = new Error()
  console.log('[wait] msg-rec', body.type, stack.stack)

  msgStore.setState({
    textBeforeGenMore: undefined,
    graph: {
      tree,
      root: graph.root,
    },
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
  const { msgs, graph } = msgStore.getState()
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

  msgStore.setState({
    msgs: nextMsgs,
    graph: {
      tree: updateChatTreeNode(graph.tree, next),
      root: graph.root,
    },
  })
}

subscribe('message-parents', { chatId: 'string', parents: 'any' }, (body) => {
  updateMsgParents(body.chatId, body.parents)
})

function updateMsgParents(chatId: string, parents: Record<string, string>, deleteIds?: string[]) {
  const { messageHistory, msgs, activeChatId, graph } = msgStore.getState()
  if (activeChatId !== chatId) return

  let tree = { ...graph.tree }

  let modified = false

  const nextMsgs = msgs.map((msg) => {
    if (!parents[msg._id]) return msg
    return { ...msg, parent: parents[msg._id] }
  })

  const nextHist = messageHistory.map((msg) => {
    if (!parents[msg._id]) return msg
    return { ...msg, parent: parents[msg._id] }
  })

  for (const [descId, parentId] of Object.entries(parents)) {
    if (typeof parentId !== 'string') continue
    const descendant = tree[descId]
    if (!descendant) continue

    if (descendant.msg.parent === parentId) {
      continue
    }

    modified = true
    const nextDesc = { ...descendant.msg, parent: parentId }
    tree = updateChatTreeNode(tree, nextDesc)
    tree[nextDesc._id].children = { ...descendant.children }

    const parent = tree[parentId]
    if (parent) {
      parent.children[nextDesc._id] = true
    }
  }

  // The caller will immediately update the tree when deleting messages
  // This prevents this function running twice due to the 'message-parents' subscription
  if (!modified && !deleteIds) {
    return
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

function updateGraphAndReload(messageId: string, updates: Partial<AppSchema.ChatMessage>) {
  const { graph, msgs } = msgStore.getState()
  const target = graph.tree[messageId]

  if (!target) {
    throw new Error(`Could not locate message in graph`)
  }

  const nextMsg = { ...target.msg, ...updates }
  const nextGraph = updateChatTreeNode(graph.tree, nextMsg)

  const leaf = msgs.slice(-1)[0]

  const fullPath = resolveChatPath(nextGraph, leaf?._id)
  const recent = fullPath.splice(-SOFT_PAGE_SIZE)

  msgStore.setState({
    graph: { tree: nextGraph, root: graph.root },
    messageHistory: fullPath,
    msgs: recent,
  })
}

function updateMessageInState(messageId: string, updates: Partial<AppSchema.ChatMessage>) {
  const { msgs, messageHistory, graph } = msgStore.getState()

  const main = findOne(messageId, msgs)
  const hist = findOne(messageId, messageHistory)

  if (!main && !hist) return

  const nextMsg = main ? { ...main, ...updates } : { ...hist!, ...updates }
  const next = replace(messageId, main ? msgs : messageHistory, nextMsg)
  const nextGraph = updateChatTreeNode(graph.tree, nextMsg)

  if (main) {
    msgStore.setState({ msgs: next, graph: { tree: nextGraph, root: graph.root } })
  } else {
    msgStore.setState({ messageHistory: next, graph: { tree: nextGraph, root: graph.root } })
  }
}

function getParentUpdates(graph: ChatTree, fromId: string, deleteOne: boolean) {
  const realDeletes: string[] = [fromId]
  const from = graph[fromId]
  const nextParent = from?.msg.parent || ''

  if (!from) {
    throw new Error(`Could not locate message to delete`)
  }

  const parents: Record<string, string> = {}
  const current: Record<string, true> = { ...from.children }

  if (deleteOne) {
    for (const childId in from.children) {
      const msg = graph[childId]
      if (!msg) continue

      parents[childId] = nextParent
    }
  }

  if (!deleteOne) {
    do {
      const count = Object.keys(current).length
      if (count === 0) break

      for (const childId in current) {
        realDeletes.push(childId)
        const child = graph[childId]
        delete current[childId]
        if (!child) continue

        Object.assign(current, { ...child.children })
      }
    } while (true)
  }

  return { parents, deletes: realDeletes, leafId: nextParent }
}
