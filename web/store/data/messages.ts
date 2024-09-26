import { InferenceState } from '../../../common/prompt'
import { AppSchema } from '../../../common/types/schema'
import { api, isLoggedIn } from '../api'
import { chatStore } from '../chat'
import { localApi } from './storage'
import { toastStore } from '../toasts'
import { TemplateOpts } from '/common/template-parser'
import { exclude, replace } from '/common/util'
import { toMap } from '/web/shared/util'
import { subscribe } from '../socket'
import { genApi } from './inference'
import { botGen } from './bot-generate'

export const msgsApi = {
  swapMessage,
  editMessage,
  editMessageProps,
  getMessages,
  deleteMessages,
  getActiveTemplateParts,
}

export type StreamCallback = (res: string, state: InferenceState) => any

export async function swapMessage(msg: AppSchema.ChatMessage, text: string, retries: string[]) {
  return swapMessageProps(msg, { msg: text, retries })
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
  msg: AppSchema.ChatMessage,
  update: Partial<AppSchema.ChatMessage>
) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/chat/${msg._id}/message-props`, update)
    return res
  }

  const messages = await localApi.getMessages(msg.chatId)
  const next = replace(msg._id, messages, update)
  await localApi.saveMessages(msg.chatId, next)
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
  const { active } = chatStore.getState()

  const { parts, entities, props } = await botGen.getActivePromptOptions({ kind: 'summary' })
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
  }

  return opts
}

/**
 *
 * @param chatId
 * @param msgIds
 * @param leafId
 * @param parents Which nodes need their parent updated. Key=node, Value=parentId
 * @returns
 */
export async function deleteMessages(
  chatId: string,
  msgIds: string[],
  leafId: string,
  parents: Record<string, string>
) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/chat/${chatId}/messages`, {
      ids: msgIds,
      leafId,
      parents,
    })
    return res
  }

  const msgs = await localApi.getMessages(chatId)

  for (const msg of msgs) {
    const parent = parents[msg._id]
    if (!parent) continue
    msg.parent = parent
  }

  await localApi.saveMessages(chatId, exclude(msgs, msgIds))

  const chats = await localApi.loadItem('chats')
  const chat = chats.find((ch) => ch._id === chatId)
  if (chat && leafId) {
    const nextChat: AppSchema.Chat = {
      ...chat,
      treeLeafId: leafId,
      updatedAt: new Date().toISOString(),
    }
    await localApi.saveChats(replace(chatId, chats, nextChat))
  }

  return localApi.result({ success: true })
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

/**
 * Partials
 */
subscribe(
  'inference-partial',
  { partial: 'string', requestId: 'string', output: 'any?' },
  (body) => {
    const cb = genApi.callbacks.get(body.requestId)
    if (!cb) return

    cb(body.partial, 'partial', body.output)
  }
)

subscribe(
  'message-partial',
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
subscribe('message-error', { requestId: 'string', error: 'string' }, (body) => {
  const cb = genApi.callbacks.get(body.requestId)
  if (!cb) return

  cb(body.error, 'error')
  genApi.callbacks.delete(body.requestId)
  toastStore.error(`Inference failed: ${body.error}`)
})

subscribe('inference-warning', { requestId: 'string', warning: 'string' }, (body) => {
  const cb = genApi.callbacks.get(body.requestId)
  if (!cb) return

  cb(body.warning, 'warning')
  toastStore.warn(`Inference warning: ${body.warning}`)
})

subscribe('inference-error', { requestId: 'string', error: 'string' }, (body) => {
  const cb = genApi.callbacks.get(body.requestId)
  if (!cb) return

  cb(body.error, 'error')
  toastStore.warn(`Inference error: ${body.error}`)
})
