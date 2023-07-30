import { v4 } from 'uuid'
import { NOVEL_MODELS } from '../../../common/adapters'
import { defaultChars } from '../../../common/characters'
import { AppSchema } from '../../../common/types/schema'
import { api } from '../api'
import { toastStore } from '../toasts'
import { storage } from '/web/shared/util'

type StorageKey = keyof typeof KEYS

const ID = 'anon'

const emptyCfg: AppSchema.AppConfig = {
  adapters: [],
  canAuth: false,
  version: '',
  assetPrefix: '',
  imagesSaved: false,
  selfhosting: false,
  registered: [],
  authUrls: [],
  pipelineProxyEnabled: false,
  horde: {
    workers: [],
    models: [],
  },
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
  scenario: 'scenario',
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
  scenario: AppSchema.ScenarioBook[]
}

const localStore = new Map<keyof LocalStorage, any>()

const fallbacks: { [key in StorageKey]: LocalStorage[key] } = {
  characters: [
    {
      _id: v4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kind: 'character',
      userId: 'anon',
      ...defaultChars.Robot,
    },
  ],
  chats: [],
  presets: [],
  config: {
    _id: 'anon',
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
    useLocalPipeline: false,
  },
  profile: { _id: '', kind: 'profile', userId: 'anon', handle: 'You' },
  lastChatId: '',
  messages: [],
  memory: [],
  scenario: [],
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
      !res.result.scenario ||
      !res.result.characters ||
      !res.result.chats
    ) {
      const entities = await migrateToJson()
      entities.user._id = 'anon'
      await api.post('/json', entities)
      return localApi.result({ ...entities, config: cfg.result! })
    }

    if (res.result) {
      res.result.user._id = 'anon'
      localStore.set('config', res.result.user)
      localStore.set('profile', res.result.profile)
      localStore.set('presets', res.result.presets)
      localStore.set('memory', res.result.books)
      localStore.set('scenario', res.result.scenario)
      localStore.set('characters', res.result.characters)
      localStore.set('chats', res.result.chats)
      return res
    }
  }

  const entities = await getGuestInitEntities()
  return localApi.result({
    ...entities,
    config: cfg.result!,
  })
}

async function migrateToJson() {
  const entities = await getGuestInitEntities()

  await api.post('/json', entities)

  for (const chat of entities.chats) {
    const messages = await localApi.getMessages(chat._id, true)
    await api.post(`/json/messages/${chat._id}`, messages)
  }

  return entities
}

async function getGuestInitEntities() {
  await migrateLegacyItems()
  /**
   * @TODO Should we do this in parallel ?
   */
  const user = await localApi.loadItem('config', true)
  const profile = await localApi.loadItem('profile', true)
  const presets = await localApi.loadItem('presets', true)
  const books = await localApi.loadItem('memory', true)
  const scenario = await localApi.loadItem('scenario', true)
  const characters = await localApi.loadItem('characters', true)
  const chats = await localApi.loadItem('chats', true)

  user._id = 'anon'

  return { user, presets, profile, books, scenario, characters, chats }
}

async function migrateLegacyItems() {
  const keys = [
    'config',
    'profile',
    'presets',
    'memory',
    'scenario',
    'characters',
    'chats',
  ] as const

  for (const key of keys) {
    const old = legacyLoadItem(key)
    if (!old) continue

    await saveItem(key, old)
    localStorage.removeItem(key)
    console.log('Migrated', key)
  }

  for (const key in localStorage) {
    if (!key.startsWith('messages-')) continue

    const data = localStorage.getItem(key)
    if (!data) continue

    await storage.setItem(key, data)
    localStorage.removeItem(key)
    console.log('Migrated', key)
  }
}

export async function saveMessages(chatId: string, messages: AppSchema.ChatMessage[]) {
  const key = `messages-${chatId}`
  if (SELF_HOSTING) {
    return api.post(`/json/messages/${chatId}`, messages)
  } else {
    storage.setItem(key, JSON.stringify(messages))
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

  const messages = await storage.getItem(`messages-${chatId}`)
  if (!messages) return []

  return JSON.parse(messages) as AppSchema.ChatMessage[]
}

export async function saveChars(state: AppSchema.Character[]) {
  await saveItem('characters', state)
}

export async function saveChats(state: AppSchema.Chat[]) {
  await saveItem('chats', state)
}

export async function saveProfile(state: AppSchema.Profile) {
  await saveItem('profile', state)
}

export async function saveConfig(state: AppSchema.User) {
  await saveItem('config', state)
}

export async function savePresets(state: AppSchema.UserGenPreset[]) {
  await saveItem('presets', state)
}

export async function saveBooks(state: AppSchema.MemoryBook[]) {
  await saveItem('memory', state)
}

export async function saveScenarios(state: AppSchema.ScenarioBook[]) {
  await saveItem('scenario', state)
}

export async function deleteChatMessages(chatId: string) {
  await storage.removeItem(`messages-${chatId}`)
}

async function saveItem<TKey extends keyof typeof KEYS>(key: TKey, value: LocalStorage[TKey]) {
  if (SELF_HOSTING) {
    localStore.set(key, value)
    await api.post('/json', { [key]: value })
  } else {
    localStore.set(key, value)
    await storage.setItem(KEYS[key], JSON.stringify(value))
  }
}

export async function loadItem<TKey extends keyof typeof KEYS>(
  key: TKey,
  local?: boolean
): Promise<LocalStorage[TKey]> {
  if (local || !selfHosting()) {
    const item = await storage.getItem(KEYS[key])
    if (item) {
      const parsed = JSON.parse(item)
      localStore.set(key, parsed)
      return parsed
    }

    const fallback = fallbacks[key]
    storage.setItem(key, JSON.stringify(fallback))

    return fallback
  }

  const item = localStore.get(key)
  return item
}

function legacyLoadItem<TKey extends keyof typeof KEYS>(
  key: TKey,
  local?: boolean
): LocalStorage[TKey] | void {
  if (local || !selfHosting()) {
    const item = storage.localGetItem(KEYS[key])
    if (item) {
      const parsed = JSON.parse(item)
      return parsed
    }
  }
}

export function error(error: string) {
  return { result: undefined, error }
}

export function result<T>(result: T) {
  return Promise.resolve({ result, status: 200, error: undefined })
}

export const localApi = {
  saveChars,
  saveChats,
  saveConfig,
  saveMessages,
  savePresets,
  saveProfile,
  saveBooks,
  saveScenarios,
  deleteChatMessages,
  loadItem,
  getMessages,
  KEYS,
  ID,
  error,
  result,
  handleGuestInit,
}
