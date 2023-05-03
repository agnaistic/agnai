import type { ImportChat, NewChat } from '../chat'
import { v4 } from 'uuid'
import { AppSchema } from '../../../srv/db/schema'
import { api, isLoggedIn } from '../api'
import { loadItem, localApi, saveChats } from './storage'

export type AllChat = AppSchema.Chat & { character?: { name: string } }

export const chatsApi = {
  createChat,
  createNewChat,
  editChat,
  getAllChats,
  getChat,
  getBotChats,
  editChatGenPreset,
  editChatGenSettings,
  importChat,
  deleteChat,
}

export async function getChat(id: string) {
  if (isLoggedIn()) {
    const res = await api.get<{
      chat: AppSchema.Chat
      messages: AppSchema.ChatMessage[]
      character: AppSchema.Character
      members: AppSchema.Profile[]
      active: string[]
    }>(`/chat/${id}`)
    return res
  }

  const chat = loadItem('chats').find((ch) => ch._id === id)
  const character = loadItem('characters').find((ch) => ch._id === chat?.characterId)
  const profile = loadItem('profile')
  const messages = await localApi.getMessages(id)

  if (!chat) {
    return localApi.error(`Chat not found in data`)
  }

  if (!character) {
    return localApi.error(`Character not found in data`)
  }

  return localApi.result({ chat, character, messages, members: [profile], active: [] })
}

export async function editChat(id: string, update: Partial<AppSchema.Chat>) {
  if (isLoggedIn()) {
    const res = await api.method<AppSchema.Chat>('put', `/chat/${id}`, update)
    return res
  }

  const chats = loadItem('chats')
  const prev = chats.find((ch) => ch._id === id)
  if (!prev) return localApi.error(`Chat not found`)

  const next = { ...prev, ...update, updatedAt: new Date().toISOString() }
  localApi.saveChats(localApi.replace(id, chats, next))
  return localApi.result(next)
}

export async function createChat(characterId: string, props: NewChat) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.Chat>('/chat', { characterId, ...props })
    return res
  }

  const chars = loadItem('characters')
  const chats = loadItem('chats')
  const char = chars.find((ch) => ch._id === characterId)
  if (!char) return localApi.error(`Character not found`)

  const { chat, msg } = createNewChat(char, props)

  localApi.saveChats(chats.concat(chat))
  if (props.greeting) localApi.saveMessages(chat._id, [msg])
  return localApi.result(chat)
}

export async function importChat(characterId: string, props: ImportChat) {
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.Chat>(`/chat/import`, { characterId, ...props })
    return res
  }

  const char = localApi.loadItem('characters').find((char) => char._id === characterId)
  if (!char) {
    return localApi.error(`Character not found`)
  }

  const { chat } = createNewChat(char, {
    name: props.name,
    scenario: props.scenario || char.scenario,
    greeting: props.greeting || char.greeting,
    sampleChat: props.sampleChat || char.sampleChat,
    overrides: { ...char.persona },
  })

  const start = Date.now()
  const messages: AppSchema.ChatMessage[] = props.messages.map((msg, i) => ({
    _id: v4(),
    chatId: chat._id,
    kind: 'chat-message',
    msg: msg.msg,
    characterId: msg.characterId ? char._id : undefined,
    userId: msg.userId ? localApi.ID : undefined,
    createdAt: new Date(start + i).toISOString(),
    updatedAt: new Date(start + i).toISOString(),
  }))

  localApi.saveChats(localApi.loadItem('chats').concat(chat))
  localApi.saveMessages(chat._id, messages)

  return localApi.result(chat)
}

export async function deleteChat(chatId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/chat/${chatId}`)
    return res
  }

  const chats = loadItem('chats').filter((ch) => ch._id !== chatId)
  localApi.saveChats(chats)
  return localApi.result<any>({ success: true })
}

export async function getAllChats() {
  if (isLoggedIn()) {
    const res = await api.get<{ chats: AllChat[]; characters: AppSchema.Character[] }>('/chat')
    return res
  }

  const characters = loadItem('characters')
  const chats = loadItem('chats') as AllChat[]

  if (!chats?.length) {
    const [char] = characters
    const { chat, msg } = createNewChat(char, { ...char, overrides: char.persona })
    localApi.saveChats([chat])
    localApi.saveMessages(chat._id, [msg])

    chats.push(chat)
  }

  return localApi.result({ chats, characters })
}

export async function getBotChats(characterId: string) {
  if (isLoggedIn()) {
    const res = await api.get<{ character: AppSchema.Character; chats: AppSchema.Chat[] }>(
      `/chat/${characterId}/chats`
    )
    return res
  }

  const character = loadItem('characters').find((ch) => ch._id === characterId)
  if (!character) return localApi.error('Character not found')

  const chats = loadItem('chats').filter((ch) => ch.characterId === characterId)
  return localApi.result({ character, chats })
}

export async function editChatGenSettings(chatId: string, settings: AppSchema.Chat['genSettings']) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/chat/${chatId}/generation`, settings)
    return res
  }

  const chats = loadItem('chats')
  const chat = chats.find((ch) => ch._id === chatId)
  if (!chat) return localApi.error(`Chat not found`)

  const next: AppSchema.Chat = {
    ...chat,
    genSettings: settings,
    genPreset: undefined,
    updatedAt: new Date().toISOString(),
  }
  saveChats(localApi.replace(chatId, chats, next))
  return localApi.result(next)
}

export async function editChatGenPreset(chatId: string, preset: string) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/chat/${chatId}/preset`, { preset })
    return res
  }

  const chats = loadItem('chats')
  const chat = chats.find((ch) => ch._id === chatId)
  if (!chat) return localApi.error(`Chat not found`)

  const next: AppSchema.Chat = {
    ...chat,
    genSettings: undefined,
    genPreset: preset,
    updatedAt: new Date().toISOString(),
  }
  saveChats(localApi.replace(chatId, chats, next))
  return localApi.result(next)
}

export function createNewChat(char: AppSchema.Character, props: NewChat) {
  const chat: AppSchema.Chat = {
    _id: v4(),
    characterId: char._id,
    ...props,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'chat',
    userId: localApi.ID,
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
