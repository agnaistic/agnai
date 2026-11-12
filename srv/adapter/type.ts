import type { JsonField, PromptLine, PromptPlaceholders } from '../../common/prompt'
import { AppSchema } from '../../common/types/schema'
import { AppLog } from '../middleware'
import { SubscriptionPreset } from './agnaistic'
import { ThirdPartyFormat } from '/common/adapters'
import { StructureEntities } from '/common/guidance/json-schema'
import { PresetConnection } from '/common/providers'
import { Memory, TokenCounter } from '/common/types'

export type MsgAttachment = { type: 'image'; image: string }
export type RequestAttachments = { [messageId: string]: MsgAttachment[] }
export type HistoryLine = {
  _id: string
  msg: string
  role: 'user' | 'model'
  json: Record<string, string>
}

export type ChatRole = 'user' | 'assistant' | 'system'

export type Completion<T = Inference> = {
  id: string
  created: number
  model: string
  object: string
  choices: CompletionContent<T>
  error?: { message: string }
}

export type CompletionTick =
  | { token: string }
  | { tokens: string; gens?: string[] }
  | { tokens: string }
  | { thoughts: string }
  | void

export type CompletionGenerator<T = Completion> = (opts: {
  userId: string
  url: string
  headers: Record<string, string | string[] | number>
  body: any
  service: string
  signal: AbortController
  log: AppLog | undefined
  format?: ThirdPartyFormat | 'openrouter' | 'raw'
}) => AsyncGenerator<
  { error?: string; tokens?: string; token?: string; index?: any; thoughts?: string } | T,
  T | undefined
>

export type CompletionItem<T extends string = ChatRole> = {
  role: T
  content: string
  name?: string
}

export type CompletionContent<T> = Array<
  { finish_reason: string; index: number } & ({ text: string } | T)
>
export type Inference = { message: { content: string; role: ChatRole } }
export type AsyncDelta = { delta: Partial<Inference['message']> }

export type GenerateRequestV2 = {
  requestId: string
  v?: number
  kind:
    | 'send'
    | 'send-event:world'
    | 'send-event:character'
    | 'send-event:hidden'
    | 'send-event:ooc'
    | 'send-noreply'
    | 'ooc'
    | 'retry'
    | 'continue'
    | 'self'
    | 'summary'
    | 'request'
    | 'plain'
    | 'chat-query'

  /** For chat-adjacent tasks such as captioning, summarizing, etc */
  systemPrompt?: string

  chat: AppSchema.Chat
  char: AppSchema.Character
  replyAs: AppSchema.Character
  user: AppSchema.User
  members: AppSchema.Profile[]
  sender: AppSchema.Profile

  parts: PromptPlaceholders

  history?: HistoryLine[]

  linesCount?: number
  text?: string
  settings?: Partial<AppSchema.GenSettings>
  replacing?: AppSchema.ChatMessage
  continuing?: AppSchema.ChatMessage
  characters: Record<string, AppSchema.Character>
  impersonate?: AppSchema.Character
  book?: AppSchema.MemoryBook
  resolvedScenario?: string

  jsonSchema?: { fields: JsonField[]; entities: StructureEntities }
  jsonValues?: Record<string, any>

  /** Base64 attachments */
  attachments?: RequestAttachments
  indexes?: { [messageId: string]: number }
  hasAttachments?: boolean

  /** Chat Tree  */
  parent?: string

  /** Date ISO string */
  lastMessage?: string

  chatEmbeds?: Array<Memory.UserEmbed<{ name: string }>>
  userEmbeds?: Memory.UserEmbed[]

  /**
   * For 'local requests'
   * If the response is generated on the client, we pass the generated response here
   * then pass the whole payload to the same endpoint, but skip the generation to re-use the same message creation logic
   */
  response?: string
  eventStream?: boolean
  subscription?: SubscriptionPreset

  /** Deprecated fields */
  lines: string[] /** Deprecated */
  imageData?: string /** Deprecated */
  reschemaPrompt?: string /** Deprecated */
}

export type GenerateOptions = {
  senderId: string
  chatId: string
  message: string
  log: AppLog
  retry?: AppSchema.ChatMessage
  continue?: string
}

export type AdapterProps = {
  kind: GenerateRequestV2['kind']
  conn: PresetConnection
  chat: AppSchema.Chat
  char: AppSchema.Character
  replyAs: AppSchema.Character
  user: AppSchema.User
  members: AppSchema.Profile[]
  sender: AppSchema.Profile

  prompt: string
  messages?: Array<{ role: string; content: string }>

  parts: PromptPlaceholders

  lines: string[]
  promptLines: PromptLine[]

  characters: Record<string, AppSchema.Character>
  impersonate: AppSchema.Character | undefined
  lastMessage?: string
  requestId: string
  encoder?: TokenCounter

  jsonSchema?: any
  reschemaPrompt?: string
  jsonValues: Record<string, any> | undefined

  hasAttachments?: boolean
  imageData?: string
  attachments?: RequestAttachments

  guidance?: boolean
  placeholders?: Record<string, string>
  lists?: Record<string, string[]>
  previous?: Record<string, string>

  subscription?: SubscriptionPreset

  /** GenSettings mapped to an object for the target adapter */
  gen: Partial<AppSchema.GenSettings>
  mappedSettings: any
  guest?: string
  log: AppLog
  isThirdParty: boolean
  inserts?: Map<number, string>
  contextSize?: number
  signal: AbortController
}

export type ModelAdapter = (
  opts: AdapterProps
) => AsyncGenerator<
  | string
  | { gens: string[] }
  | { partial: string }
  | { error: any }
  | { meta: any }
  | { prompt: any }
  | { warning: string }
  | { thoughts: string }
>
