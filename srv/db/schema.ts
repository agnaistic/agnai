import { ChatAdapter } from '../../common/adapters'

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
    defaultAdapter: ChatAdapter
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
  }

  export interface ChatMember {
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

    createdAt: string
    updatedAt: string
  }

  /** Description of the character */
  export type CharacterPersona = {
    kind: 'wpp' | 'sbf' | 'boostyle'
    attributes: { [key: string]: string[] }
  }

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
    adapter: ChatAdapter

    createdAt: string
    updatedAt: string
  }

  export interface GenSettings {
    name: string
    temp: number
    maxTokens: number
    repPenalty: number
    repPenaltySlope: number
    repPenaltyRange: number
    typicalP: number
    topP: number
    topK: number
  }
}

export type Doc<T extends AllDoc['kind'] = AllDoc['kind']> = Extract<AllDoc, { kind: T }>

export type AllDoc =
  | AppSchema.Chat
  | AppSchema.ChatMessage
  | AppSchema.Character
  | AppSchema.User
  | AppSchema.Profile

export const defaultGenPresets: AppSchema.GenSettings[] = []
