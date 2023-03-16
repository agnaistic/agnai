import { v4 } from 'uuid'
import { defaultPresets, isDefaultPreset } from '../../../common/presets'
import { createPrompt } from '../../../common/prompt'
import { AppSchema, defaultGenPresets } from '../../../srv/db/schema'
import { api, isLoggedIn } from '../api'
import { loadItem, local } from './storage'

export async function editMessage(msg: AppSchema.ChatMessage, replace: string) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/chat/${msg._id}/message`, { message: replace })
    return res
  }

  const messages = local.getMessages(msg.chatId)
  const next = local.replace(msg._id, messages, { msg: replace })
  local.saveMessages(msg.chatId, next)
  return local.result({ success: true })
}

/**
 * This handles:
 * - The user sending a new message (typing a message and pressing Enter)
 *
 * @param chatId
 * @param message
 * @returns
 */
export async function sendMessage(chatId: string, message: string) {
  if (!chatId) return local.error('Could not send message: No active chat')

  if (isLoggedIn()) {
    return api.post<string | AppSchema.ChatMessage>(`/chat/${chatId}/message`, { message })
  }

  const entities = getGuestEntities(chatId)
  if ('error' in entities) return entities

  const { chat, char, profile, msgs, user } = entities

  // We intentionally do not store the new message in local storage
  // The server will send the 'user message' via the socket if the this request is not a retry
  const next = msgs.concat(newMessage(chat, local.ID, message.trim()))
  const prompt = createPrompt({ char, chat, members: [profile], messages: next })

  await api.post(`/chat/${chat._id}/guest-message`, {
    char,
    chat,
    user,
    sender: profile,
    prompt: prompt.prompt,
    lines: prompt.lines,
    message,
  })
  return local.result({ success: true })
}

/**
 * This handles:
 * - The last message being re-sent when the message is last message is user-generated
 *
 * If the last message is server-generated, we use 'retryCharacterMessage' for this as we are replacing a message.
 *
 * @param chatId
 * @param message
 * @param retry Flag that indicates: - the last message is being re-sent AND the last message is from the user.
 * @returns
 */
export async function retryUserMessage(chatId: string, message: string) {
  if (!chatId) return local.error('Could not send message: No active chat')

  if (isLoggedIn()) {
    return api.post<string | AppSchema.ChatMessage>(`/chat/${chatId}/message`, {
      message,
      retry: true,
    })
  }

  const entities = getGuestEntities(chatId)
  if ('error' in entities) return entities

  const { chat, char, profile, msgs, user } = entities
  const prompt = createPrompt({ char, chat, members: [profile], messages: msgs })

  await api.post(`/chat/${chat._id}/guest-message`, {
    char,
    chat,
    user,
    sender: profile,
    prompt: prompt.prompt,
    lines: prompt.lines,
    message,
    retry: true,
  })
  return local.result({ success: true })
}

/**
 *
 * @param chatId
 * @param message The user-generated message preceding the message to replace
 * @param replace The server-generated message we are replacing
 */
export async function retryCharacterMessage(
  chatId: string,
  message: AppSchema.ChatMessage,
  replace: AppSchema.ChatMessage,
  continueOn?: string
) {
  if (isLoggedIn()) {
    return api.post<string | AppSchema.ChatMessage>(`/chat/${chatId}/retry/${replace._id}`, {
      message: message.msg,
      continue: continueOn,
    })
  }

  const entities = getGuestEntities(chatId)
  if ('error' in entities) return entities

  const { chat, char, msgs, profile, user } = entities

  const index = msgs.findIndex((msg) => msg._id === replace._id)
  if (index === -1) return local.error(`Cannot find message to replace`)

  const prompt = createPrompt({
    char,
    chat,
    members: [profile],
    messages: msgs.slice(0, index),
    continue: continueOn,
  })

  return api.post(`/chat/${chat._id}/guest-message`, {
    char,
    chat,
    user,
    sender: profile,
    prompt: prompt.prompt,
    lines: prompt.lines,
    retry: true,
    message: message.msg,
    continue: continueOn,
  })
}

export async function deleteMessages(chatId: string, msgIds: string[]) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/chat/${chatId}/messages`, { ids: msgIds })
    return res
  }

  const msgs = local.getMessages(chatId)
  const ids = new Set(msgIds)
  const next = msgs.filter((msg) => ids.has(msg._id) === false)
  local.saveMessages(chatId, next)

  return local.result({ success: true })
}

function newMessage(
  chat: AppSchema.Chat,
  senderId: string,
  msg: string,
  fromChar?: boolean
): AppSchema.ChatMessage {
  return {
    _id: v4().slice(0, 8),
    chatId: chat._id,
    kind: 'chat-message',
    userId: fromChar ? undefined : senderId,
    characterId: fromChar ? senderId : undefined,
    msg,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function getGuestEntities(chatId: string) {
  const chat = loadItem('chats').find((ch) => ch._id === chatId)
  const char = loadItem('characters').find((ch) => ch._id === chat?.characterId)

  if (!chat || !char) {
    return local.error(`Chat or character not found (chat: ${!!chat}, character: ${!!char})`)
  }

  const profile = loadItem('profile')
  const msgs = local.getMessages(chat?._id)
  const user = loadItem('config')
  setPreset(user, chat)

  return { chat, char, profile, msgs, user }
}

function setPreset(user: AppSchema.User, chat: AppSchema.Chat) {
  // The server does not store presets for users
  // Override the `genSettings` property with the locally stored preset data if found
  if (chat.genPreset) {
    const presets = loadItem('presets')
    const preset = presets.find((pre) => pre._id === chat.genPreset)
    if (preset) {
      chat.genSettings = preset
    }
  }

  const adapter = !chat.adapter || chat.adapter === 'default' ? user.defaultAdapter : chat.adapter
  if (!user.defaultPresets) return

  /**
   * If an anonymous user has configured default service presets then
   * we need to send those along with the request in the form of 'overrides'
   */
  const defaultPreset = user.defaultPresets[adapter]
  if (!defaultPreset) return

  // Default presets are correctly handled by the API
  if (isDefaultPreset(defaultPreset)) {
    chat.genPreset = defaultPreset
    return
  }

  const presets = loadItem('presets')
  const preset = presets.find((pre) => pre._id === defaultPreset)
  chat.genSettings = preset
}
