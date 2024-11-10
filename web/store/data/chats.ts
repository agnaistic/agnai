import type { ImportChat, NewChat } from '../chat'
import { v4 } from 'uuid'
import { AppSchema } from '../../../common/types/schema'
import { api, isLoggedIn } from '../api'
import { loadItem, localApi, saveChats } from './storage'
import { replace } from '/common/util'
import { getStore } from '../create'
import { parseTemplate } from '/common/template-parser'

export type AllChat = AppSchema.Chat & { character?: { name: string } }

export const chatsApi = {
  createChat,
  createNewChat,
  editChat,
  getAllChats,
  getChat,
  getBotChats,
  editChatGenPreset,
  importChat,
  deleteChat,
  addCharacter,
  upsertTempCharacter,
  removeCharacter,
  restartChat,
}

export async function getChat(id: string) {
  if (isLoggedIn()) {
    const res = await api.get<{
      chat: AppSchema.Chat
      messages: AppSchema.ChatMessage[]
      character: AppSchema.Character
      characters: AppSchema.Character[]
      members: AppSchema.Profile[]
      active: string[]
    }>(`/chat/${id}`)
    return res
  }

  const allChars = await loadItem('characters')
  const chat = await loadItem('chats').then((res) => res.find((ch) => ch._id === id))
  const character = allChars.find((ch) => ch._id === chat?.characterId)

  const profile = await loadItem('profile')
  const messages = await localApi.getMessages(id)

  if (!chat) {
    return localApi.error(`Chat not found in data`)
  }

  const charIds = new Set(Object.keys(chat?.characters || {}).concat(chat?.characterId))
  const characters = allChars.filter((ch) => ch._id === chat?.characterId || charIds.has(ch._id))

  if (!character) {
    return localApi.error(`Character not found in data`)
  }

  return localApi.result({ chat, character, messages, members: [profile], active: [], characters })
}

export async function restartChat(chatId: string) {
  const impersonating = getStore('character').getState().impersonating
  if (isLoggedIn()) {
    const res = await api.method('post', `/chat/${chatId}/restart`, {
      impersonating: impersonating?._id,
    })
    return res
  }

  const chats = await loadItem('chats')
  const chars = await loadItem('characters')

  const chat = chats.find((ch) => ch._id === chatId)
  if (!chat) return localApi.error('Chat not found')

  const char = chars.find((ch) => ch._id === chat.characterId)
  const greeting = char?.greeting

  if (char && greeting) {
    const profile = getStore('user').getState().profile
    const { parsed } = await parseTemplate(greeting, {
      char,
      chat,
      sender: profile!,
      impersonate: impersonating,
      jsonValues: {},
    })
    await localApi.saveMessages(chatId, [
      {
        _id: v4(),
        kind: 'chat-message',
        msg: parsed,
        characterId: char._id,
        chatId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retries: char.alternateGreetings || [],
      },
    ])
  } else {
    await localApi.saveMessages(chatId, [])
  }

  return localApi.result({ success: true })
}

export async function editChat(
  id: string,
  update: Partial<AppSchema.Chat> & { useOverrides: boolean | undefined }
) {
  if (isLoggedIn()) {
    const res = await api.method<AppSchema.Chat>('put', `/chat/${id}`, update)
    return res
  }

  const chats = await loadItem('chats')
  const prev = chats.find((ch) => ch._id === id)
  if (!prev) return localApi.error(`Chat not found`)

  const next = { ...prev, ...update, updatedAt: new Date().toISOString() }

  if (update.useOverrides === false) {
    delete next.overrides
    delete next.greeting
    delete next.sampleChat
    delete next.scenario
  }

  await localApi.saveChats(replace(id, chats, next))
  return localApi.result(next)
}

export async function createChat(characterId: string, props: NewChat) {
  const impersonating = getStore('character').getState().impersonating
  if (isLoggedIn()) {
    const res = await api.post<AppSchema.Chat>('/chat', {
      characterId,
      ...props,
      impersonating: impersonating?._id,
    })
    return res
  }

  const chars = await loadItem('characters')
  const chats = await loadItem('chats')
  const char = chars.find((ch) => ch._id === characterId)
  if (!char) return localApi.error(`Character not found`)

  const { chat, msg } = createNewChat(char, props)

  // If there is a greeting, parse it before persisting
  if (msg?.msg) {
    const profile = getStore('user').getState().profile
    const { parsed } = await parseTemplate(msg.msg, {
      chat,
      char: char!,
      sender: profile!,
      impersonate: impersonating,
      jsonValues: {},
    })
    msg.msg = parsed
  }

  await localApi.saveChats(chats.concat(chat))

  if (msg) await localApi.saveMessages(chat._id, [msg])
  return localApi.result(chat)
}

export async function importChat(
  characterId: string,
  props: ImportChat,
  allChars: { list: AppSchema.Character[]; map: Record<string, AppSchema.Character> }
) {
  for (const msg of props.messages) {
    if (msg.characterId === 'imported') {
      msg.characterId = characterId
      continue
    }
  }

  if (isLoggedIn()) {
    const res = await api.post<AppSchema.Chat>(`/chat/import`, { characterId, ...props })
    return res
  }

  const char = await localApi
    .loadItem('characters')
    .then((res) => res.find((char) => char._id === characterId))
  if (!char) {
    return localApi.error(`Character not found`)
  }

  const { chat } = createNewChat(char, {
    name: props.name,
    scenario: props.scenario || char.scenario,
    greeting: props.greeting || char.greeting,
    sampleChat: props.sampleChat || char.sampleChat,
    overrides: { ...char.persona },
    useOverrides: props.useOverrides ?? false,
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
    retries: [],
  }))

  const nextChats = await localApi.loadItem('chats').then((res) => res.concat(chat))
  await localApi.saveChats(nextChats)
  await localApi.saveMessages(chat._id, messages)

  return localApi.result(chat)
}

export async function deleteChat(chatId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/chat/${chatId}`)
    return res
  }

  const chats = await loadItem('chats').then((res) => res.filter((ch) => ch._id !== chatId))
  await localApi.saveChats(chats)
  return localApi.result<any>({ success: true })
}

export async function getAllChats() {
  if (isLoggedIn()) {
    const res = await api.get<{ chats: AllChat[]; characters: AppSchema.Character[] }>('/chat')
    return res
  }

  const characters = await loadItem('characters')
  const chats = (await loadItem('chats')) as AllChat[]

  if (!chats?.length) {
    const [char] = characters
    const { chat, msg } = createNewChat(char, {
      mode: 'standard',
      scenarioIds: [],
      name: 'Your first conversation',
      greeting: undefined,
      scenario: undefined,
      sampleChat: undefined,
      overrides: undefined,
      useOverrides: false,
    })
    await localApi.saveChats([chat])

    if (msg) await localApi.saveMessages(chat._id, [msg])

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

  const character = await loadItem('characters').then((res) =>
    res.find((ch) => ch._id === characterId)
  )
  if (!character) return localApi.error('Character not found')

  const chats = await loadItem('chats').then((res) =>
    res.filter((ch) => ch.characterId === characterId)
  )
  return localApi.result({ character, chats })
}

export async function editChatGenPreset(chatId: string, preset: string) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/chat/${chatId}/preset`, { preset })
    return res
  }

  const chats = await loadItem('chats')
  const chat = chats.find((ch) => ch._id === chatId)
  if (!chat) return localApi.error(`Chat not found`)

  const next: AppSchema.Chat = {
    ...chat,
    genSettings: undefined,
    genPreset: preset,
    updatedAt: new Date().toISOString(),
  }
  await saveChats(replace(chatId, chats, next))
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

  const greeting = props.overrides ? props.greeting : char.greeting
  if (!greeting) return { chat, msg: undefined }

  const msg: AppSchema.ChatMessage = {
    _id: v4(),
    chatId: chat._id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'chat-message',
    msg: char.greeting,
    characterId: char._id,
    retries: char.alternateGreetings || [],
  }

  return { chat, msg }
}

export async function addCharacter(chatId: string, charId: string) {
  if (isLoggedIn()) {
    const res = await api.post(`/chat/${chatId}/characters`, { charId })
    return res
  }

  const chats = await localApi.loadItem('chats')
  const chat = chats.find((ch) => ch._id === chatId)
  const char = await localApi
    .loadItem('characters')
    .then((res) => res.find((ch) => ch._id === charId))

  if (!chat || !char) {
    return localApi.error(`Chat or Character not found`)
  }

  const next: AppSchema.Chat = {
    ...chat,
    characters: Object.assign(chat?.characters || {}, { [charId]: true }),
  }

  await localApi.saveChats(replace(chatId, chats, next))
  return localApi.result({ success: true, char })
}

export async function upsertTempCharacter(
  chatId: string,
  char: Omit<AppSchema.BaseCharacter, '_id'> & { _id?: string }
) {
  if (isLoggedIn()) {
    const res = await api.post(`/chat/${chatId}/temp-character`, char)
    return res
  }

  const chats = await localApi.loadItem('chats')
  const chat = chats.find((ch) => ch._id === chatId)

  if (!chat) return localApi.error(`Chat not found`)
  const newchar: AppSchema.Character = {
    ...char,
    _id: char._id || `temp-${v4().slice(0, 8)}`,
    userId: 'anon',
    kind: 'character',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const temp = chat.tempCharacters || {}
  temp[newchar._id] = newchar
  chat.tempCharacters = temp

  await localApi.saveChats(replace(chatId, chats, chat))
  return localApi.result({ success: true, char: newchar })
}

export async function removeCharacter(chatId: string, charId: string) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/chat/${chatId}/characters/${charId}`, { charId })
    return res
  }

  const chats = await localApi.loadItem('chats')
  const chat = chats.find((ch) => ch._id === chatId)
  const char = await localApi
    .loadItem('characters')
    .then((res) => res.find((ch) => ch._id === charId))

  if (!chat || !char) {
    return localApi.error(`Chat or Character not found`)
  }

  const next: AppSchema.Chat = {
    ...chat,
    characters: Object.assign(chat?.characters || {}, { [charId]: false }),
  }

  await localApi.saveChats(replace(chatId, chats, next))
  return localApi.result({ success: true })
}
