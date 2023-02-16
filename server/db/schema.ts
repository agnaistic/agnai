export namespace AppSchema {
  export interface Settings {
    kind: 'settings'
    koboldUrl: string
    novelApiKey: string
    chaiUrl: string
  }

  export interface Chat {
    kind: 'chat'
    name: string
    actors: string[]
    createdAt: string
    updatedAt: string
  }

  export interface ChatMessage {
    kind: 'chat-message'
    actor: string
    msg: string
    sent: string
  }
}

export type AllDoc = AppSchema.Chat | AppSchema.Settings | AppSchema.ChatMessage
export type Doc<T extends AllDoc['kind'] = AllDoc['kind']> = Extract<AllDoc, { kind: T }>
