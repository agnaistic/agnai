import { v4 } from 'uuid'
import { NOVEL_MODELS } from '../../../common/adapters'
import { AppSchema } from '../../../srv/db/schema'

type StorageKey = keyof typeof KEYS

const ID = 'anon'

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

const fallbacks: { [key in StorageKey]: LocalStorage[key] } = {
  characters: [
    {
      _id: v4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kind: 'character',
      userId: 'anonymous',
      name: 'Robot',
      persona: {
        kind: 'boostyle',
        attributes: {
          species: ['human'],
          mind: ['kind', 'compassionate', 'caring', 'tender', 'forgiving'],
          personality: ['kind', 'compassionate', 'caring', 'tender', 'forgiving'],
          job: ['therapist'],
        },
      },
      sampleChat:
        '{{user}}: Something has been troubling me this week.\r\n{{char}}: *I appear genuinely concerned* What is troubling you?',
      scenario:
        "Robot is in their office. You knock on the door and Robot beckons you inside. You open the door and enter Robot's office.",
      greeting:
        "*A soft smile appears on my face as I see you enter the room* Hello! It's good to see you again. Please have a seat! What is on your mind today?",
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
    luminaiUrl: '',
  },
  profile: { _id: '', kind: 'profile', userId: ID, handle: 'You' },
  lastChatId: '',
  messages: [],
  memory: [],
}

export function saveChars(state: AppSchema.Character[]) {
  localStorage.setItem(KEYS.characters, JSON.stringify(state))
}

export function saveChats(state: AppSchema.Chat[]) {
  localStorage.setItem(KEYS.chats, JSON.stringify(state))
}

export function saveMessages(chatId: string, messages: AppSchema.ChatMessage[]) {
  const key = `messages-${chatId}`
  localStorage.setItem(key, JSON.stringify(messages))
}

export function getMessages(chatId: string): AppSchema.ChatMessage[] {
  const messages = localStorage.getItem(`messages-${chatId}`)
  if (!messages) return []

  return JSON.parse(messages) as AppSchema.ChatMessage[]
}

export function saveProfile(state: AppSchema.Profile) {
  localStorage.setItem(KEYS.profile, JSON.stringify(state))
}

export function saveConfig(state: AppSchema.User) {
  localStorage.setItem(KEYS.config, JSON.stringify(state))
}

export function savePresets(state: AppSchema.UserGenPreset[]) {
  localStorage.setItem(KEYS.presets, JSON.stringify(state))
}

export function deleteChatMessages(chatId: string) {
  localStorage.removeItem(`messages-${chatId}`)
}

export function loadItem<TKey extends keyof typeof KEYS>(key: TKey): LocalStorage[TKey] {
  const item = localStorage.getItem(KEYS[key])
  if (item) return JSON.parse(item)

  const fallback = fallbacks[key]
  localStorage.setItem(key, JSON.stringify(fallback))

  return fallback
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

export const local = {
  saveChars,
  saveChats,
  saveConfig,
  saveMessages,
  savePresets,
  saveProfile,
  deleteChatMessages,
  loadItem,
  getMessages,
  KEYS,
  ID,
  error,
  replace,
  result,
}

type Result<T> = Promise<{ result: T | undefined; error?: string; status: number }>
