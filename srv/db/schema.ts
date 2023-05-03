import { AIAdapter, ChatAdapter, PersonaFormat } from '../../common/adapters'
import { GenerationPreset } from '../../common/presets'
import { ImageSettings } from './image-schema'

export namespace AppSchema {
  export interface Token {
    userId: string
    username: string
    admin: boolean
    iat: number
    exp: number
  }

  export interface Profile {
    _id: string
    kind: 'profile'
    userId: string
    handle: string
    avatar?: string
    persona?: Persona
  }

  export interface User {
    _id: string
    kind: 'user'
    username: string
    hash: string

    admin: boolean

    novelApiKey: string
    novelModel: string
    novelVerified?: boolean

    koboldUrl: string
    thirdPartyFormat: 'kobold' | 'openai' | 'claude'
    thirdPartyPassword: string
    thirdPartyPasswordSet?: boolean
    luminaiUrl: string
    oobaUrl: string

    oaiKey: string
    oaiKeySet?: boolean

    hordeKey: string
    hordeModel: string
    hordeName?: string
    hordeUseTrusted?: boolean
    hordeWorkers?: string[]

    scaleUrl?: string
    scaleApiKey?: string
    scaleApiKeySet?: boolean

    claudeApiKey?: string
    claudeApiKeySet?: boolean

    defaultAdapter: AIAdapter
    defaultPresets?: { [key in AIAdapter]?: string }
    defaultPreset?: string

    createdAt?: string

    images?: ImageSettings
    // adapterConfig?: { [key in AIAdapter]?: Record<string, any> }
  }

  export interface Chat {
    _id: string
    kind: 'chat'
    userId: string
    memoryId?: string

    memberIds: string[]

    name: string
    characterId: string
    messageCount: number
    adapter?: ChatAdapter

    greeting: string
    scenario: string
    sampleChat: string
    overrides: Persona

    createdAt: string
    updatedAt: string

    genPreset?: GenerationPreset | string
    genSettings?: Omit<GenSettings, 'name'>
  }

  export interface ChatMember {
    _id: string
    kind: 'chat-member'
    chatId: string
    userId: string
    createdAt: string
  }

  export interface ChatMessage {
    _id: string
    kind: 'chat-message'
    chatId: string
    msg: string
    characterId?: string
    userId?: string

    // Only chat owners can rate messages for now
    rating?: 'y' | 'n' | 'none'
    adapter?: string

    createdAt: string
    updatedAt: string
    first?: boolean
  }

  /** Description of the character or user */
  export type Persona =
    | {
        kind: PersonaFormat
        attributes: { [key: string]: string[] }
      }
    | { kind: 'text'; attributes: { text: [string] } }

  export interface Character {
    _id: string
    kind: 'character'
    userId: string

    name: string
    description?: string
    persona: Persona
    greeting: string
    scenario: string
    sampleChat: string

    avatar?: string

    createdAt: string
    updatedAt: string

    favorite?: boolean
  }

  export interface ChatInvite {
    _id: string
    kind: 'chat-invite'
    byUserId: string
    invitedId: string
    chatId: string
    createdAt: string
    characterId: string
    state: 'pending' | 'rejected' | 'accepted'
  }

  export interface ChatLock {
    kind: 'chat-lock'

    /** Chat ID, Unique */
    chatLock: string

    /** Time to live in seconds. Locks older than this are invalid */
    ttl: number

    /** ISO string - We will ignore locks of a particular age */
    obtained: string

    /** We return this top the caller requesting a lock. It is used to ensure the lock is valid during a transaction. */
    lockId: string
  }

  export interface UserGenPreset extends GenSettings {
    _id: string
    kind: 'gen-setting'
    userId: string
  }

  export interface GenSettings {
    name: string
    service?: AIAdapter

    temp: number
    maxTokens: number
    maxContextLength?: number
    repetitionPenalty: number
    repetitionPenaltyRange: number
    repetitionPenaltySlope: number
    typicalP: number
    topP: number
    topK: number
    topA: number
    tailFreeSampling: number
    encoderRepitionPenalty?: number
    penaltyAlpha?: number
    addBosToken?: boolean
    banEosToken?: boolean
    order?: number[]

    gaslight?: string
    useGaslight?: boolean
    ultimeJailbreak?: string
    antiBond?: boolean

    frequencyPenalty?: number
    presencePenalty?: number
    oaiModel?: string
    claudeModel?: string

    memoryDepth?: number
    memoryContextLimit?: number
    memoryReverseWeight?: boolean
    src?: string

    images?: {
      adapter: string
    }
  }

  export interface AppConfig {
    adapters: AIAdapter[]
    version: string
    canAuth: boolean
    imagesSaved: boolean
    assetPrefix: string
    selfhosting: boolean
  }

  export interface MemoryBook {
    kind: 'memory'
    _id: string
    name: string
    description?: string
    userId: string
    entries: MemoryEntry[]
  }

  export interface MemoryEntry {
    name: string

    /** The text injected into the prompt */
    entry: string

    /** Keywords that trigger the entry to be injected */
    keywords: string[]

    /** When choosing which memories to discard, lowest priority will be discarded first */
    priority: number

    /** When determining what order to render the memories, the highest will be at the bottom  */
    weight: number

    enabled: boolean
  }
}

export type Doc<T extends AllDoc['kind'] = AllDoc['kind']> = Extract<AllDoc, { kind: T }>

export type AllDoc =
  | AppSchema.Chat
  | AppSchema.ChatMessage
  | AppSchema.Character
  | AppSchema.User
  | AppSchema.Profile
  | AppSchema.ChatLock
  | AppSchema.ChatMember
  | AppSchema.ChatInvite
  | AppSchema.UserGenPreset
  | AppSchema.MemoryBook

export const defaultGenPresets: AppSchema.GenSettings[] = []

export type NewBook = Omit<AppSchema.MemoryBook, 'userId' | '_id' | 'kind'>
