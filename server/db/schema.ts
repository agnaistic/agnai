export namespace AppSchema {
  export interface Settings {
    kind: 'settings'
    koboldUrl: string
    novelApiKey: string
    chaiUrl: string
  }

  export interface Chat {
    kind: 'chat'
    _id: string
    name: string
    characterId: string
    adapter?: ChatAdapter

    createdAt: string
    updatedAt: string
  }

  export interface ChatMessage {
    kind: 'chat-message'
    _id: string
    charId?: string
    msg: string
    sent: string
  }

  export type ChatAdapter = 'kobold' | 'chai' | 'novel'

  export type CharacterPersona =
    | { kind: 'text'; text: string }
    | { kind: 'json'; type: string; name: string; properties: { [key: string]: string[] } }

  export interface Character {
    kind: 'character'
    _id: string

    name: string
    persona: CharacterPersona
    greeting: string
    exampleChat: string

    avatarUrl?: string
    adapter: ChatAdapter

    createdAt: string
    updatedAt: string
  }

  export interface GenSettings {
    temperature: number
    maxTokens: number
    repetitionPenalty: number
    typicalP: number
  }
}

export type Doc<T extends AllDoc['kind'] = AllDoc['kind']> = Extract<AllDoc, { kind: T }>

export type AllDoc =
  | AppSchema.Chat
  | AppSchema.Settings
  | AppSchema.ChatMessage
  | AppSchema.Character
