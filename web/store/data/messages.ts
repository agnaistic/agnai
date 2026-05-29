import { InferenceState } from '../../../common/prompt'
import { AppSchema } from '../../../common/types/schema'
import { api, getUserId, isLoggedIn } from '../api'
import { chatStore } from '../chat'
import { ApiResult, localApi } from './storage'
import { toastStore } from '../toasts'
import { parseTemplate, TemplateOpts } from '/common/template-parser'
import { exclude, replace } from '/common/util'
import { toMap } from '/web/shared/util'
import { localEmit, subscribe } from '../socket'
import { genApi } from './inference'
import { botGen } from './bot-generate'
import { getPromptEntities } from './common'
import { emptyMsg } from '/web/pages/Chat/helpers'
import { v4 } from 'uuid'
import { getScenarioEventType } from '/common/scenario'
import { getStore } from '../create'
import { getDeletionChanges, toQuickGraph } from '/common/chat'
import { chatsApi } from './chats'

export const msgsApi = {
  createMessage,
  swapMessage,
  editMessage,
  editMessageProps,
  getMessages,
  deleteMessages,
  getActiveTemplateParts,
}

export type StreamCallback = (res: string, state: InferenceState) => any

export async function swapMessage(
  msg: AppSchema.ChatMessage,
  text: string,
  retries: AppSchema.ChatMessage['retries'],
  embed?: string
) {
  return swapMessageProps(msg, { msg: text, retries })
}

export async function createMessage(opts: {
  text: string
  chatId: string

  /** New Message ID */
  messageId: string

  /** New message parent ID */
  parent?: string

  /** The message will be authored by this character */
  character?: AppSchema.Character

  /** If true, no user ID will be attributed to the message */
  bot?: boolean

  /** If 'ooc' or 'send-event:ooc', the message will be flagged as OOC */
  kind?: string

  /** Shorthand for the `kind` property */
  ooc?: boolean

  meta?: any
  json?: any
}) {
  const props = await getPromptEntities()
  const messageId = opts.messageId || v4()

  const text = await parseTemplate(opts.text, {
    char: props.char,
    chat: props.chat,
    sender: props.profile,
    impersonate: opts.character,
    replyAs: props.char,
    lastMessage: props.lastMessage?.date,
    jsonValues: props.messages.reduce(
      (prev, curr) => Object.assign(prev, curr.json?.values || {}),
      {}
    ),
  })

  const preMsg = emptyMsg({
    id: messageId,
    message: text.parsed,
    chatId: opts.chatId,
    charId: opts.character?._id,
    parent: opts.parent,
    userId: opts.bot ? undefined : getUserId(),
    meta: opts.meta,
    event: opts.kind ? getScenarioEventType(opts.kind) : undefined,
    ooc: opts.kind === 'ooc' || opts.kind === 'send-event:ooc',
  })

  localEmit({ type: 'message-created', msg: preMsg, chatId: opts.chatId })

  const result = await api.post(`/chat/${opts.chatId}/send`, {
    kind: opts.kind,
    text: text.parsed,
    impersonate: opts.character,
    ooc: opts.ooc,
    parent: opts.parent,
    bot: opts.bot,
    messageId,
    meta: opts.meta,
    json: opts.json,
  })

  // await record('add', opts.chatId, messageId, opts.parent)
  if (isLoggedIn() && result.result?.message) {
    localEmit({ type: 'message-created', msg: result.result.message, chatId: opts.chatId })
  }

  return result
}

export async function swapMessageProps(
  msg: AppSchema.ChatMessage,
  update: Partial<AppSchema.ChatMessage>
) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/chat/${msg._id}/message-swap`, update)
    return res
  }

  const messages = await localApi.getMessages(msg.chatId)
  const next = replace(msg._id, messages, update)
  await localApi.saveMessages(msg.chatId, next)
  return localApi.result({ success: true })
}

export async function editMessage(msg: AppSchema.ChatMessage, replace: string) {
  return editMessageProps(msg, { msg: replace.replace(/\r\n/g, '\n') })
}

export async function editMessageProps(
  msg: Pick<AppSchema.ChatMessage, '_id' | 'chatId'>,
  payload: Partial<AppSchema.ChatMessage> & { assignTree?: boolean }
) {
  const update = { ...payload }
  if (update.meta && Object.keys(update.meta).length === 0) {
    delete update.meta
  }

  if ('parent' in payload && !payload.parent) {
    delete payload.parent
  }

  // if (payload.parent) {
  //   await record('edit', msg.chatId, msg._id, payload.parent)
  // }

  if (isLoggedIn()) {
    const { msgs } = getStore('messages').getState()
    const original = msgs.find((m) => m._id === msg._id)
    const emit = { type: 'message-edited', chatId: msg.chatId, messageId: msg._id, ...update }
    if (original) localEmit(emit)

    const res = await api.method('put', `/chat/${msg._id}/message-props`, update)
    if (res.result && !original) localEmit(emit)
    if (res.error && original) localEmit({ ...emit, ...original })

    return res
  }

  const messages = await localApi.getMessages(msg.chatId)
  if (update.assignTree) {
    await chatsApi.editChat(msg.chatId, { treeLeafId: msg._id })
    delete update.assignTree
  }

  const next = replace(msg._id, messages, update)
  await localApi.saveMessages(msg.chatId, next)
  localEmit({ type: 'message-edited', chatId: msg.chatId, messageId: msg._id, ...update })
  return localApi.result({ success: true })
}

export async function getMessages(chatId: string, before: string) {
  // Guest users already have their entire chat history
  if (!isLoggedIn()) return localApi.result({ messages: [] })

  const res = await api.get<{ messages: AppSchema.ChatMessage[] }>(`/chat/${chatId}/messages`, {
    before,
  })
  return res
}

async function getActiveTemplateParts() {
  const { details, lastChatId } = chatStore.getState()
  const active = details[lastChatId]

  const signal = new AbortController()
  const { parts, entities, props, lines } = await botGen.getActivePromptOptions({
    signal,
    kind: 'summary',
    text: '',
  })
  const toLine = messageToLine({
    chars: entities.characters,
    members: entities.members,
    sender: entities.profile,
    impersonate: entities.impersonating,
  })

  const opts: TemplateOpts = {
    chat: entities.chat,
    replyAs: active?.replyAs ? entities.characters[active.replyAs] : entities.char,
    char: entities.char,
    characters: entities.characters,
    lines: entities.messages.filter((msg) => msg.adapter !== 'image' && !msg.event).map(toLine),
    parts,
    sender: entities.profile,
    jsonValues: props.json,
    impersonate: entities.impersonating,
    history: lines,
  }

  return opts
}

/**
 *
 * @param chatId
 * @param msgIds
 * @param leafId Current leaf (tail) of the graph that the user is viewing
 * @param parents Which nodes need their parent updated. Key=node, Value=parentId
 * @returns
 */
export async function deleteMessages(
  chatId: string,
  msgIds: string[],
  leafId: string
): Promise<
  ApiResult<{
    chat: Partial<AppSchema.Chat>
    messages: Array<Pick<AppSchema.ChatMessage, '_id' | 'parent'>>
  }>
> {
  if (!chatId) {
    throw new Error(`Chat ID not set`)
  }

  const { msgs: storeMsgs } = getStore('messages').getState()
  // for (const msgId of msgIds) {
  // const msg = graph.tree[msgId]
  // await record('del', chatId, msgId, msg?.msg?.parent)
  // }

  if (isLoggedIn()) {
    if (window.flags.softdel) {
      const localGraph = toQuickGraph(storeMsgs, leafId)
      const edges = getDeletionChanges(localGraph, msgIds)

      return localApi.result(edges.updates)
    }

    const res = await api.method('delete', `/chat/${chatId}/messages-v2`, {
      ids: msgIds,
      leafId,
      // soft: true,
    })

    return res
  }

  const msgs = await localApi.getMessages(chatId)
  const localGraph = toQuickGraph(msgs, leafId)
  const edges = getDeletionChanges(localGraph, msgIds)

  const updates = new Map(edges.updates.messages.map((u) => [u._id, u]))

  const nextMsgs = msgs.map((msg) => {
    const match = updates.get(msg._id)
    if (!match) return msg
    return { ...msg, parent: match.parent }
  })

  await localApi.saveMessages(chatId, exclude(nextMsgs, msgIds))

  const chats = await localApi.loadItem('chats')
  const chat = chats.find((ch) => ch._id === chatId)
  if (chat && leafId) {
    const nextChat: AppSchema.Chat = {
      ...chat,
      ...edges.updates.chat,
      updatedAt: new Date().toISOString(),
    }
    await localApi.saveChats(replace(chatId, chats, nextChat))
  }

  return localApi.result(edges.updates)
}

function messageToLine(opts: {
  chars: Record<string, AppSchema.Character>
  sender: AppSchema.Profile
  members: AppSchema.Profile[]
  impersonate?: AppSchema.Character
}) {
  const map = toMap(opts.members)
  return (msg: AppSchema.ChatMessage) => {
    const entity =
      (msg.characterId ? opts.chars[msg.characterId]?.name : map[msg.userId!]?.handle) ||
      opts.impersonate?.name ||
      opts.sender.handle ||
      'You'
    return `${entity}: ${msg.json?.history || msg.msg}`
  }
}

// async function record(type: 'add' | 'del' | 'edit', chatId: string, id: string, parent?: string) {
//   const key = `debug-${chatId}`
//   const raw = await storage.getItem(key).then((res) => res || '[]')
//   const history: any[] = JSON.parse(raw)

//   history.push({ type, id, parent })
//   await storage.setItem(`debug-${chatId}`, JSON.stringify(history))
// }

/**
 * Partials
 */
subscribe(
  ['message-partial', 'inference-partial'],
  { requestId: 'string', partial: 'string', json: 'boolean?' },
  (body) => {
    const cb = genApi.callbacks.get(body.requestId)
    if (!cb) return

    cb(body.partial, 'partial')
  }
)

/**
 * Completions
 */
subscribe('inference', { requestId: 'string', response: 'string', output: 'any?' }, (body) => {
  const cb = genApi.callbacks.get(body.requestId)
  if (!cb) return

  cb(body.response, 'done', body.output)
  genApi.callbacks.delete(body.requestId)
})

subscribe('message-created', { requestId: 'string', msg: 'string' }, (body) => {
  const cb = genApi.callbacks.get(body.requestId)
  if (!cb) return

  cb(body.msg, 'done')
  genApi.callbacks.delete(body.requestId)
})

subscribe('chat-query', { requestId: 'string', response: 'string' }, (body) => {
  const cb = genApi.callbacks.get(body.requestId)
  if (!cb) return

  cb(body.response, 'done')
  genApi.callbacks.delete(body.requestId)
})

/**
 * Errors
 */
subscribe(
  ['inference-error', 'message-error'],
  { requestId: 'string', error: 'string' },
  (body) => {
    const cb = genApi.callbacks.get(body.requestId)
    if (!cb) return

    cb(body.error, 'error')
    genApi.callbacks.delete(body.requestId)
    toastStore.error(`Inference error: ${body.error}`)
  }
)

subscribe(
  ['inference-warning', 'message-warning'],
  { requestId: 'string', warning: 'string' },
  (body) => {
    const cb = genApi.callbacks.get(body.requestId)
    if (!cb) return

    cb(body.warning, 'warning')
    toastStore.warn(`Inference warning: ${body.warning}`)
  }
)
