import { v4 } from 'uuid'
import { AppSchema } from '../../../srv/db/schema'
import { api, isLoggedIn } from '../api'
import { NewChat } from '../chat'
import { loadItem, local, saveChats } from './storage'

export async function getChat(id: string) {
  if (isLoggedIn()) {
    const res = await api.get<{
      chat: AppSchema.Chat
      messages: AppSchema.ChatMessage[]
      character: AppSchema.Character
      members: AppSchema.Profile[]
    }>(`/chat/${id}`)
    return res
  }

  const chat = loadItem('chats').find((ch) => ch._id === id)
  const character = loadItem('characters').find((ch) => ch._id === chat?.characterId)
  const profile = loadItem('profile')
  const messages = local.getMessages(id)

  if (!chat || !character) {
    return local.error(`Chat or character not found`)
  }

  return local.result({ chat, character, messages, members: [profile] })
}

export async function editChat(id: string, update: Partial<AppSchema.Chat>) {
  if (isLoggedIn()) {
    const res = await api.method<AppSchema.Chat>('put', `/chat/${id}`, update)
    return res
  }

  const chats = loadItem('chats')
  const prev = chats.find((ch) => ch._id === id)
  if (!prev) return local.error(`Chat not found`)

  const next = { ...prev, ...update, updatedAt: new Date().toISOString() }
  local.saveChats(local.replace(id, chats, next))
  return local.result(next)
}

export async function createChat(characterId: string, props: NewChat) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.Chat>('/chat', { characterId, ...props })
    return res
  }

  const chars = loadItem('characters')
  const chats = loadItem('chats')
  const char = chars.find((ch) => ch._id === characterId)
  if (!char) return local.error(`Character not found`)

  const { chat, msg } = createNewChat(char, props)

  local.saveChats(chats.concat(chat))
  local.saveMessages(chat._id, [msg])
  return local.result(chat)
}

export async function deleteChat(chatId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/chat/${chatId}`)
    return res
  }

  const chats = loadItem('chats').filter((ch) => ch._id !== chatId)
  local.saveChats(chats)
  return local.result<any>({ success: true })
}

export async function getAllChats() {
  if (isLoggedIn()) {
    const res = await api.get<{ chats: AppSchema.Chat[]; characters: AppSchema.Character[] }>(
      '/chat'
    )
    return res
  }

  const chats = loadItem('chats')
  const characters = loadItem('characters')

  return local.result({ chats, characters })
}

export async function getBotChats(characterId: string) {
  if (isLoggedIn()) {
    const res = await api.get<{ character: AppSchema.Character; chats: AppSchema.Chat[] }>(
      `/chat/${characterId}/chats`
    )
    return res
  }

  const character = loadItem('characters').find((ch) => ch._id === characterId)
  if (!character) return local.error('Character not found')

  const chats = loadItem('chats').filter((ch) => ch.characterId === characterId)
  return local.result({ character, chats })
}

export async function editChatGenSettings(chatId: string, settings: AppSchema.Chat['genSettings']) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/chat/${chatId}/generation`, settings)
    return res
  }

  const chats = loadItem('chats')
  const chat = chats.find((ch) => ch._id === chatId)
  if (!chat) return local.error(`Chat not found`)

  const next: AppSchema.Chat = {
    ...chat,
    genSettings: settings,
    genPreset: undefined,
    updatedAt: new Date().toISOString(),
  }
  saveChats(local.replace(chatId, chats, next))
  return local.result(next)
}

export async function editChatGenPreset(chatId: string, preset: string) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/chat/${chatId}/preset`, { preset })
    return res
  }

  const chats = loadItem('chats')
  const chat = chats.find((ch) => ch._id === chatId)
  if (!chat) return local.error(`Chat not found`)

  const next: AppSchema.Chat = {
    ...chat,
    genSettings: undefined,
    genPreset: preset,
    updatedAt: new Date().toISOString(),
  }
  saveChats(local.replace(chatId, chats, next))
  return local.result(next)
}

function createNewChat(char: AppSchema.Character, props: NewChat) {
  const chat: AppSchema.Chat = {
    _id: v4(),
    characterId: char._id,
    ...props,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'chat',
    userId: local.ID,
    memberIds: [],
    messageCount: 1,
  }

  const msg: AppSchema.ChatMessage = {
    _id: v4(),
    chatId: chat._id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'chat-message',
    msg: char.greeting,
    characterId: char._id,
  }

  return { chat, msg }
}
