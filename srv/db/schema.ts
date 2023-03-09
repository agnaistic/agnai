import { AIAdapter, ChatAdapter, PersonaFormat } from '../../common/adapters'
import { GenerationPreset } from '../../common/presets'

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
  }

  export interface User {
    _id: string
    kind: 'user'
    username: string
    hash: string

    admin: boolean
    novelApiKey: string
    novelModel: string
    koboldUrl: string
    luminaiUrl: string
    oobaUrl: string

    hordeKey: string
    hordeModel: string
    hordeName?: string

    defaultAdapter: AIAdapter
  }

  export interface Chat {
    _id: string
    kind: 'chat'
    userId: string
    memberIds: string[]

    name: string
    characterId: string
    messageCount: number
    adapter?: ChatAdapter

    greeting: string
    scenario: string
    sampleChat: string
    overrides: CharacterPersona

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
  }

  /** Description of the character */
  export type CharacterPersona =
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
    persona: CharacterPersona
    greeting: string
    scenario: string
    sampleChat: string

    avatar?: string

    createdAt: string
    updatedAt: string
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
    order?: number[]
  }

  export interface AppConfig {
    adapters: AIAdapter[]
    canAuth: boolean
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

export const defaultGenPresets: AppSchema.GenSettings[] = []
