import { v4 } from 'uuid'
import { defaultPresets, isDefaultPreset } from '../../../common/presets'
import { createPrompt, getAdapter } from '../../../common/prompt'
import { GenerateRequestV2 } from '../../../srv/adapter/type'
import { AppSchema } from '../../../srv/db/schema'
import { api, isLoggedIn } from '../api'
import { getStore } from '../create'
import { loadItem, local } from './storage'

export async function editMessage(msg: AppSchema.ChatMessage, replace: string) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/chat/${msg._id}/message`, { message: replace })
    return res
  }

  const messages = await local.getMessages(msg.chatId)
  const next = local.replace(msg._id, messages, { msg: replace })
  local.saveMessages(msg.chatId, next)
  return local.result({ success: true })
}

export async function getMessages(chatId: string, before: string) {
  // Guest users already have their entire chat history
  if (!isLoggedIn()) return local.result({ messages: [] })

  const res = await api.get<{ messages: AppSchema.ChatMessage[] }>(`/chat/${chatId}/messages`, {
    before,
  })
  return res
}

type GenerateOpts =
  /**
   * A user sending a new message
   */
  | { kind: 'send'; text: string }
  /**
   * Either:
   * - The last message in the chat is a user message so we are going to generate a new response
   * - The last message in the chat is a bot message so we are going to re-generate a response and update the 'replacingId' chat message
   */
  | { kind: 'retry' }
  /**
   * The last message in the chat is a bot message and we want to generate more text for this message.
   */
  | { kind: 'continue' }

export async function generateResponseV2(opts: GenerateOpts) {
  const entities = await getPromptEntities()
  const [message, lastMessage] = entities.messages.slice(-2)

  let retry: AppSchema.ChatMessage | undefined
  let replacing: AppSchema.ChatMessage | undefined
  let continuing: AppSchema.ChatMessage | undefined

  if (opts.kind === 'retry') {
    if (lastMessage.characterId) {
      retry = message
      replacing = lastMessage
    } else {
      retry = lastMessage
    }
  }

  if (opts.kind === 'continue') {
    continuing = lastMessage
  }

  const messages = (
    opts.kind === 'send' || opts.kind === 'continue'
      ? entities.messages
      : replacing
      ? entities.messages.slice(0, -1)
      : entities.messages
  ).slice()

  if (opts.kind === 'send') {
    messages.push(emptyMsg(entities.chat, { msg: opts.text, userId: entities.user._id }))
  }

  const prompt = createPrompt({
    char: entities.char,
    chat: entities.chat,
    user: entities.user,
    members: entities.members.concat([entities.profile]),
    continue: opts.kind === 'continue' ? lastMessage.msg : undefined,
    book: entities.book,
    retry,
    settings: entities.settings,
    messages,
  })

  const { avatar: _, ...sender } = entities.profile
  const { avatar: __, ...char } = entities.char

  const request: GenerateRequestV2 = {
    kind: opts.kind,
    chat: entities.chat,
    user: entities.user,
    char,
    sender,
    members: entities.members,
    parts: prompt.parts,
    lines: prompt.lines,
    text: opts.kind === 'send' ? opts.text : undefined,
    settings: entities.settings,
    replacing,
    continuing,
  }

  const res = await api.post(`/chat/${entities.chat._id}/generate`, request)
  return res
}

export async function deleteMessages(chatId: string, msgIds: string[]) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/chat/${chatId}/messages`, { ids: msgIds })
    return res
  }

  const msgs = await local.getMessages(chatId)
  const ids = new Set(msgIds)
  const next = msgs.filter((msg) => ids.has(msg._id) === false)
  local.saveMessages(chatId, next)

  return local.result({ success: true })
}

export async function getPromptEntities() {
  if (isLoggedIn()) {
    const entities = getAuthedPromptEntities()
    if (!entities) throw new Error(`Could not collate data for prompting`)
    return entities
  }

  const entities = await getGuestEntities()
  if (!entities) throw new Error(`Could not collate data for prompting`)
  return entities
}

async function getGuestEntities() {
  const active = getStore('chat').getState().active
  if (!active) return

  const chat = active.chat
  const char = active.char

  if (!chat || !char) return

  const book = chat?.memoryId
    ? loadItem('memory').find((mem) => mem._id === chat.memoryId)
    : undefined

  const profile = loadItem('profile')
  const messages = await local.getMessages(chat?._id)
  const user = loadItem('config')
  const settings = getGuestPreset(user, chat)

  return { chat, char, user, profile, book, messages, settings, members: [] as AppSchema.Profile[] }
}

function getAuthedPromptEntities() {
  const { active, activeMembers: members } = getStore('chat').getState()
  if (!active) return

  const { profile, user } = getStore('user').getState()
  if (!profile || !user) return

  const chat = active.chat
  const char = active.char

  const book = getStore('memory')
    .getState()
    .books.list.find((book) => book._id === chat.memoryId)

  const messages = getStore('messages').getState().msgs
  const settings = getAuthGenSettings(chat, user)

  return { chat, char, user, profile, book, messages, settings, members }
}

function getAuthGenSettings(
  chat: AppSchema.Chat,
  user: AppSchema.User
): Partial<AppSchema.GenSettings> | undefined {
  const presets = getStore('presets').getState().presets
  if (chat.genPreset) {
    if (isDefaultPreset(chat.genPreset)) return defaultPresets[chat.genPreset]
    const preset = presets.find((pre) => pre._id === chat.genPreset)
    if (preset) return preset
  }

  if (chat.genSettings) return chat.genSettings
  const { adapter } = getAdapter(chat, user)
  if (!user.defaultPresets) return

  const svcPreset = user.defaultPresets[adapter]
  if (!svcPreset) return

  if (isDefaultPreset(svcPreset)) return defaultPresets[svcPreset]
  const preset = presets.find((pre) => pre._id === svcPreset)
  return preset
}

function getGuestPreset(user: AppSchema.User, chat: AppSchema.Chat) {
  // The server does not store presets for users
  // Override the `genSettings` property with the locally stored preset data if found
  const presets = loadItem('presets')
  if (chat.genPreset) {
    if (isDefaultPreset(chat.genPreset)) return defaultPresets[chat.genPreset]
    const preset = presets.find((pre) => pre._id === chat.genPreset)
    return preset
  }

  if (chat.genSettings) return chat.genSettings

  const { adapter } = getAdapter(chat, user)
  if (!user.defaultPresets) return

  /**
   * If an anonymous user has configured default service presets then
   * we need to send those along with the request in the form of 'overrides'
   */
  const svcPreset = user.defaultPresets[adapter]
  if (!svcPreset) return

  // Default presets are correctly handled by the API
  if (isDefaultPreset(svcPreset)) {
    return defaultPresets[svcPreset]
  }

  const preset = presets.find((pre) => pre._id === svcPreset)
  return preset
}

function emptyMsg(
  chat: AppSchema.Chat,
  props: Partial<AppSchema.ChatMessage>
): AppSchema.ChatMessage {
  return {
    _id: '',
    kind: 'chat-message',
    chatId: chat._id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    msg: '',
    ...props,
  }
}
