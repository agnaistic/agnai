import { v4 } from 'uuid'
import { NOVEL_MODELS } from '../../../common/adapters'
import { defaultChars } from '../../../common/characters'
import { AppSchema } from '../../../srv/db/schema'
import { api } from '../api'
import { toastStore } from '../toasts'

type StorageKey = keyof typeof KEYS

const ID = 'anon'

const emptyCfg: AppSchema.AppConfig = {
  adapters: [],
  canAuth: false,
  version: '',
  assetPrefix: '',
  imagesSaved: false,
  selfhosting: false,
}

let SELF_HOSTING = false

export function setSelfHosting(value: boolean) {
  SELF_HOSTING = value
}

export function selfHosting() {
  return SELF_HOSTING
}

export const KEYS = {
  characters: 'characters',
  profile: 'profile',
  messages: 'messages',
  config: 'config',
  chats: 'chats',
  presets: 'presets',
  lastChatId: 'guestLastChatId',
  memory: 'memory',
}

type LocalStorage = {
  characters: AppSchema.Character[]
  chats: AppSchema.Chat[]
  profile: AppSchema.Profile
  messages: AppSchema.ChatMessage[]
  config: AppSchema.User
  presets: AppSchema.UserGenPreset[]
  lastChatId: string
  memory: AppSchema.MemoryBook[]
}

const localStore = new Map<keyof LocalStorage, any>()

const fallbacks: { [key in StorageKey]: LocalStorage[key] } = {
  characters: [
    {
      _id: v4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kind: 'character',
      userId: 'anonymous',
      ...defaultChars.Robot,
    },
  ],
  chats: [],
  presets: [],
  config: {
    _id: ID,
    admin: false,
    hash: '',
    kind: 'user',
    oobaUrl: '',
    username: '',
    novelApiKey: '',
    oaiKey: '',
    novelModel: NOVEL_MODELS.euterpe,
    hordeKey: '',
    hordeModel: 'PygmalionAI/pygmalion-6b',
    defaultAdapter: 'horde',
    koboldUrl: '',
    thirdPartyFormat: 'kobold',
    thirdPartyPassword: '',
    luminaiUrl: '',
  },
  profile: { _id: '', kind: 'profile', userId: ID, handle: 'You' },
  lastChatId: '',
  messages: [],
  memory: [],
}

export async function handleGuestInit() {
  const cfg = await api.get<AppSchema.AppConfig>('/settings')
  if (cfg.error) {
    const entities = getGuestInitEntities()
    return localApi.result({ ...entities, config: emptyCfg })
  }

  setSelfHosting(!!cfg.result?.selfhosting)

  if (selfHosting()) {
    const res = await api.get('/json')

    if (
      !res.result.user ||
      !res.result.profile ||
      !res.result.presets ||
      !res.result.books ||
      !res.result.characters ||
      !res.result.chats
    ) {
      const entities = await migrateToJson()
      await api.post('/json', entities)
      return localApi.result({ ...entities, config: cfg.result! })
    }

    if (res.result) {
      localStore.set('config', res.result.user)
      localStore.set('profile', res.result.profile)
      localStore.set('presets', res.result.presets)
      localStore.set('memory', res.result.books)
      localStore.set('characters', res.result.characters)
      localStore.set('chats', res.result.chats)
      return res
    }
  }

  return localApi.result({
    ...getGuestInitEntities(),
    config: cfg.result!,
  })
}

async function migrateToJson() {
  const entities = getGuestInitEntities()

  await api.post('/json', entities)

  for (const chat of entities.chats) {
    const messages = await localApi.getMessages(chat._id, true)
    await api.post(`/json/messages/${chat._id}`, messages)
  }

  return entities
}

function getGuestInitEntities() {
  const user = localApi.loadItem('config', true)
  const profile = localApi.loadItem('profile', true)
  const presets = localApi.loadItem('presets', true)
  const books = localApi.loadItem('memory', true)
  const characters = localApi.loadItem('characters', true)
  const chats = localApi.loadItem('chats', true)

  return { user, presets, profile, books, characters, chats }
}

export function saveMessages(chatId: string, messages: AppSchema.ChatMessage[]) {
  if (SELF_HOSTING) {
    api.post(`/json/messages/${chatId}`, messages)
  } else {
    const key = `messages-${chatId}`
    localStorage.setItem(key, JSON.stringify(messages))
  }
}

export async function getMessages(
  chatId: string,
  local?: boolean
): Promise<AppSchema.ChatMessage[]> {
  if (!local && SELF_HOSTING) {
    const res = await api.get(`/json/messages/${chatId}`)
    if (res.result) return res.result
    if (res.error) {
      toastStore.error(`Failed to load messages: ${res.error}`)
      return []
    }
  }

  const messages = localStorage.getItem(`messages-${chatId}`)
  if (!messages) return []

  return JSON.parse(messages) as AppSchema.ChatMessage[]
}

export function saveChars(state: AppSchema.Character[]) {
  saveItem('characters', state)
}

export function saveChats(state: AppSchema.Chat[]) {
  saveItem('chats', state)
}

export function saveProfile(state: AppSchema.Profile) {
  saveItem('profile', state)
}

export function saveConfig(state: AppSchema.User) {
  saveItem('config', state)
}

export function savePresets(state: AppSchema.UserGenPreset[]) {
  saveItem('presets', state)
}

export function saveBooks(state: AppSchema.MemoryBook[]) {
  saveItem('memory', state)
}

export function deleteChatMessages(chatId: string) {
  localStorage.removeItem(`messages-${chatId}`)
}

function saveItem<TKey extends keyof typeof KEYS>(key: TKey, value: LocalStorage[TKey]) {
  if (SELF_HOSTING) {
    localStore.set(key, value)
    api.post('/json', { [key]: value })
  } else {
    localStore.set(key, value)
    localStorage.setItem(KEYS[key], JSON.stringify(value))
  }
}

export function loadItem<TKey extends keyof typeof KEYS>(
  key: TKey,
  local?: boolean
): LocalStorage[TKey] {
  if (local || !selfHosting()) {
    const item = localStorage.getItem(KEYS[key])
    if (item) {
      const parsed = JSON.parse(item)
      localStore.set(key, parsed)
      return parsed
    }

    const fallback = fallbacks[key]
    localStorage.setItem(key, JSON.stringify(fallback))

    return fallback
  }

  const item = localStore.get(key)
  return item
}

export function error(error: string) {
  return { result: undefined, error }
}

export function result<T>(result: T) {
  return Promise.resolve({ result, status: 200, error: undefined })
}

;<T>(result: T): Result<T> => Promise.resolve({ result, status: 200, error: undefined })

export function replace<T extends { _id: string }>(id: string, list: T[], item: Partial<T>) {
  return list.map((li) => (li._id === id ? { ...li, ...item } : li))
}

export const localApi = {
  saveChars,
  saveChats,
  saveConfig,
  saveMessages,
  savePresets,
  saveProfile,
  saveBooks,
  deleteChatMessages,
  loadItem,
  getMessages,
  KEYS,
  ID,
  error,
  replace,
  result,
  handleGuestInit,
}

type Result<T> = Promise<{ result: T | undefined; error?: string; status: number }>
