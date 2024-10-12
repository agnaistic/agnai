import { v4 } from 'uuid'
import { NOVEL_MODELS } from '../../../common/adapters'
import { defaultChars } from '../../../common/characters'
import { AppSchema } from '../../../common/types/schema'
import { api } from '../api'
import { toastStore } from '../toasts'
import { storage } from '/web/shared/util'
import { replace } from '/common/util'

type StorageKey = keyof typeof KEYS

const ID = 'anon'

const emptyCfg: AppSchema.AppConfig = {
  serverConfig: {} as any,
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
  openRouter: { models: [] },
  subs: [],
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
  templates: 'templates',
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
  templates: AppSchema.PromptTemplate[]
}

const localStore = new Map<keyof LocalStorage, any>()

const fallbacks: { [key in StorageKey]: LocalStorage[key] } = {
  characters: Object.values(defaultChars).map((char) => ({
    _id: v4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'character',
    userId: 'anon',
    ...char,
  })),
  chats: [],
  presets: [],
  config: {
    _id: 'anon',
    disableLTM: true,
    admin: false,
    hash: '',
    kind: 'user',
    oobaUrl: '',
    username: '',
    novelApiKey: '',
    oaiKey: '',
    novelModel: NOVEL_MODELS.euterpe,
    hordeKey: '',
    hordeModel: 'any',
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
  templates: [],
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
      !res.result.chats ||
      !res.result.trees ||
      !res.result.templates
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
      localStore.set('templates', res.result.templates)
      return res
    }
  }

  const entities = await getGuestInitEntities(cfg.result!)
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

async function getGuestInitEntities(config?: AppSchema.AppConfig) {
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

  if (!presets.length && config?.subs.length) {
    const model = config.subs.find((s) => s.preset.isDefaultSub)
    if (model) {
      const preset: AppSchema.UserGenPreset = {
        ...model?.preset,
        service: model?.service,
        _id: v4(),
        name: 'My Preset',
        kind: 'gen-setting',
        userId: 'anon',
        presetMode: 'simple',
        useMaxContext: true,
        temp: 0.75,
        maxContextLength: 8 * 1024,
        maxTokens: 350,
        minP: 0.05,
        useAdvancedPrompt: 'basic',
        registered: {
          agnaistic: {
            subscriptionId: model._id,
          },
        },
      }
      presets.push(preset)

      user.defaultPreset = preset._id
      await savePresets(presets)
      await saveConfig(user)
    }
  }

  let fixed = false
  for (const chat of chats) {
    if (!chat.tempCharacters) continue
    const chars = Object.entries(chat.tempCharacters)
    for (const [key, char] of chars) {
      if (char._id) continue
      fixed = true
      const id = v4()
      delete chat.tempCharacters[key]
      char._id = id
      chat.tempCharacters[id] = char
    }
  }

  if (fixed) {
    await saveChats(chats)
  }

  const templates = await localApi.loadItem('templates', true)

  user._id = 'anon'

  return { user, presets, profile, books, scenario, characters, chats, templates }
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
  }

  for (const key in localStorage) {
    if (!key.startsWith('messages-')) continue

    const data = localStorage.getItem(key)
    if (!data) continue

    await storage.setItem(key, data)
    localStorage.removeItem(key)
  }
}

export async function saveMessages(chatId: string, messages: AppSchema.ChatMessage[]) {
  const key = `messages-${chatId}`
  if (SELF_HOSTING) {
    return api.post(`/json/messages/${chatId}`, messages)
  } else {
    await storage.setItem(key, JSON.stringify(messages))
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

export async function saveChat(chatId: string, update: Partial<AppSchema.Chat>) {
  const chats = await loadItem('chats')
  const chat = chats.find((c) => c._id === chatId)
  if (!chat) return

  const next = replace(chatId, chats, update)
  await saveItem('chats', next)
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

export async function saveTemplates(state: AppSchema.PromptTemplate[]) {
  await saveItem('templates', state)
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
    await storage.setItem(key, JSON.stringify(fallback))

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
  saveChat,
  saveChats,
  saveConfig,
  saveMessages,
  savePresets,
  saveProfile,
  saveBooks,
  saveTemplates,
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
