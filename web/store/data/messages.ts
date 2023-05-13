import { createPrompt, getChatPreset } from '../../../common/prompt'
import { getEncoder } from '../../../common/tokenize'
import { GenerateRequestV2 } from '../../../srv/adapter/type'
import { AppSchema } from '../../../srv/db/schema'
import { api, isLoggedIn } from '../api'
import { chatStore } from '../chat'
import { getStore } from '../create'
import { userStore } from '../user'
import { loadItem, localApi } from './storage'

export type PromptEntities = Awaited<ReturnType<typeof getPromptEntities>>

export const msgsApi = {
  editMessage,
  getMessages,
  getPromptEntities,
  sendMessage,
  generateResponseV2,
  deleteMessages,
}

export async function editMessage(msg: AppSchema.ChatMessage, replace: string) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/chat/${msg._id}/message`, { message: replace })
    return res
  }

  const messages = await localApi.getMessages(msg.chatId)
  const next = localApi.replace(msg._id, messages, { msg: replace })
  localApi.saveMessages(msg.chatId, next)
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

export type GenerateOpts =
  /**
   * A user sending a new message
   */
  | { kind: 'send'; text: string }
  | { kind: 'ooc'; text: string }
  /**
   * A user request a message from a character
   */
  | { kind: 'request'; characterId: string }
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
  /**
   * Generate a message on behalf of the user
   */
  | { kind: 'self' }
  | { kind: 'summary' }

export async function sendMessage(chatId: string, opts: { kind: 'ooc' | 'send'; text: string }) {
  return await api.post(`/chat/${chatId}/send`, { text: opts.text, kind: opts.kind })
}

export async function generateResponseV2(opts: GenerateOpts) {
  const entities = await getPromptEntities()

  const { ui } = userStore()
  const { active } = chatStore()
  const [message, lastMessage] = entities.messages.slice(-2)

  let retry: AppSchema.ChatMessage | undefined
  let replacing: AppSchema.ChatMessage | undefined
  let continuing: AppSchema.ChatMessage | undefined

  let replyAsId: string

  if (opts.kind === 'request') {
    replyAsId = opts.characterId
  }

  if (opts.kind === 'retry') {
    if (!lastMessage) {
      return { error: 'No message to retry', result: undefined }
    }

    if (lastMessage.characterId) {
      retry = message
      replacing = lastMessage
      replyAsId = lastMessage.characterId
    } else {
      retry = lastMessage
      const charId = active?.replyAs ?? active?.char._id
      if (!charId) {
        return { error: 'No character to retry with', result: undefined }
      }
      replyAsId = charId
    }
  }

  if (opts.kind === 'continue') {
    continuing = lastMessage
    if (!lastMessage.characterId) {
      return { error: 'No character to continue with', result: undefined }
    }
    replyAsId = lastMessage.characterId
  }

  if (opts.kind === 'send') {
    if (!entities.autoReplyAs) {
      return { error: 'No character to continue with', result: undefined }
    }
    replyAsId = entities.autoReplyAs
  }

  let replyAs = entities.chatBots.find((ch) => ch._id === replyAsId)
  if (!replyAs) {
    return { error: 'Could not find the character to reply as', result: undefined }
  }

  const messages = (
    opts.kind === 'send' ||
    opts.kind === 'continue' ||
    opts.kind === 'summary' ||
    opts.kind === 'request'
      ? entities.messages
      : replacing
      ? entities.messages.slice(0, -1)
      : entities.messages
  ).slice()

  if (opts.kind === 'send') {
    messages.push(emptyMsg(entities.chat, { msg: opts.text, userId: entities.user._id }))
  }

  const encoder = await getEncoder()
  const prompt = createPrompt(
    {
      char: entities.char,
      chat: entities.chat,
      user: entities.user,
      members: entities.members.concat([entities.profile]),
      continue: opts.kind === 'continue' ? lastMessage.msg : undefined,
      book: entities.book,
      retry,
      settings: entities.settings,
      messages,
      replyAs,
      characters: entities.characters,
    },
    encoder
  )
  if (ui?.logPromptsToBrowserConsole) {
    console.log(`=== Sending the following prompt: ===`)
    console.log(`${prompt.parts.gaslight}\n${prompt.lines.join('\n')}\n${prompt.post}`)
  }

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
    replyAs,
    characters: entities.characters,
  }

  const res = await api.post(`/chat/${entities.chat._id}/generate`, request)
  return res
}

export async function deleteMessages(chatId: string, msgIds: string[]) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/chat/${chatId}/messages`, { ids: msgIds })
    return res
  }

  const msgs = await localApi.getMessages(chatId)
  const ids = new Set(msgIds)
  const next = msgs.filter((msg) => ids.has(msg._id) === false)
  localApi.saveMessages(chatId, next)

  return localApi.result({ success: true })
}

export async function getPromptEntities() {
  if (isLoggedIn()) {
    const entities = getAuthedPromptEntities()
    if (!entities) throw new Error(`Could not collate data for prompting`)
    return { ...entities, messages: entities.messages.filter((msg) => msg.ooc !== true) }
  }

  const entities = await getGuestEntities()
  if (!entities) throw new Error(`Could not collate data for prompting`)
  return { ...entities, messages: entities.messages.filter((msg) => msg.ooc !== true) }
}

async function getGuestEntities() {
  const { active, chatBots, chatBotMap } = getStore('chat').getState()
  if (!active) return

  const chat = active.chat
  const char = active.char

  if (!chat || !char) return

  const book = chat?.memoryId
    ? loadItem('memory').find((mem) => mem._id === chat.memoryId)
    : undefined

  const profile = loadItem('profile')
  const messages = await localApi.getMessages(chat?._id)
  const user = loadItem('config')
  const settings = getGuestPreset(user, chat)

  return {
    chat,
    char,
    user,
    profile,
    book,
    messages,
    settings,
    members: [profile] as AppSchema.Profile[],
    chatBots,
    autoReplyAs: active.replyAs,
    characters: chatBotMap,
  }
}

function getAuthedPromptEntities() {
  const { active, chatProfiles: members, chatBots, chatBotMap } = getStore('chat').getState()
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

  return {
    chat,
    char,
    user,
    profile,
    book,
    messages,
    settings,
    members,
    chatBots,
    autoReplyAs: active.replyAs,
    characters: chatBotMap,
  }
}

function getAuthGenSettings(
  chat: AppSchema.Chat,
  user: AppSchema.User
): Partial<AppSchema.GenSettings> | undefined {
  const presets = getStore('presets').getState().presets
  return getChatPreset(chat, user, presets)
}

function getGuestPreset(user: AppSchema.User, chat: AppSchema.Chat) {
  // The server does not store presets for users
  // Override the `genSettings` property with the locally stored preset data if found
  const presets = loadItem('presets')
  return getChatPreset(chat, user, presets)
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
