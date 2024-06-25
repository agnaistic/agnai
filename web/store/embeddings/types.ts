import { AppSchema } from '/common/types'

export type CacheDocument = Extract<WorkerRequest, { type: 'embedDocument' }>

export type EmbedDocument = {
  msg: string
  meta: any
}

export type RequestChatEmbed = {
  type: 'embedChat'
  chatId: string
  messages: AppSchema.ChatMessage[]
}
export type RequestDocEmbed = {
  type: 'embedDocument'
  documentId: string
  documents: EmbedDocument[]
}

export type WorkerRequest =
  | { type: 'encode'; id: string; text: string }
  | { type: 'decode'; id: string; tokens: number[] }
  | { type: 'initSimilarity'; model: string }
  | { type: 'initCaptioning'; model: string }
  | { type: 'captionImage'; image: string; requestId: string }
  | {
      type: 'queryChat'
      chatId: string
      text: string
      requestId: string
      beforeDate: string
      path: string[]
    }
  | { type: 'query'; chatId: string; text: string; requestId: string; beforeDate?: string }
  | RequestChatEmbed
  | RequestDocEmbed

export type WorkerResponse =
  | { type: 'encoding'; id: string; tokens: number[] }
  | { type: 'decoding'; id: string; text: string }
  | {
      type: 'result'
      requestId: string
      messages: Array<{ msg: string; entityId: string; similarity: number }>
    }
  | { type: 'embedLoaded' }
  | { type: 'captionLoaded' }
  | { type: 'progress'; progress: number }
  | { type: 'init' }
  | { type: 'embedded'; kind: 'chat' | 'document'; id: string }
  | { type: 'caption'; requestId: string; caption: string }
  | {
      type: 'status'
      kind: 'chat' | 'document'
      id: string
      status: string
    }
