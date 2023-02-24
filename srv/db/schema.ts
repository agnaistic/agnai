import { ChatAdapter } from '../../common/adapters'

export namespace AppSchema {
  export interface Settings {
    kind: 'settings'
    koboldUrl: string
    novelApiKey: string
    novelModel: string
    chaiUrl: string
    defaultAdapter?: ChatAdapter
  }

  export interface Chat {
    _id: string
    kind: 'chat'
    username: string
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

  export interface ChatMessage {
    _id: string
    kind: 'chat-message'
    chatId: string
    msg: string
    characterId?: string
    rating?: 'y' | 'n' | 'none'

    createdAt: string
    updatedAt: string
  }

  /** Description of the character */
  export type CharacterPersona =
    | { kind: 'text'; text: string }
    | {
        kind: 'json' | 'wpp' | 'sbf' | 'boostyle'
        attributes: { [key: string]: string[] }
      }

  export interface Character {
    _id: string
    kind: 'character'

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
  | AppSchema.Settings
  | AppSchema.ChatMessage
  | AppSchema.Character

export const defaultGenPresets: AppSchema.GenSettings[] = []
