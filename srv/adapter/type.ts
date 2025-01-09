import type { JsonField, PromptParts } from '../../common/prompt'
import { AppSchema } from '../../common/types/schema'
import { AppLog } from '../middleware'
import { ThirdPartyFormat } from '/common/adapters'
import { Memory, TokenCounter } from '/common/types'

export type ChatRole = 'user' | 'assistant' | 'system'

export type Completion<T = Inference> = {
  id: string
  created: number
  model: string
  object: string
  choices: CompletionContent<T>
  error?: { message: string }
}

export type CompletionGenerator = (
  userId: string,
  url: string,
  headers: Record<string, string | string[] | number>,
  body: any,
  service: string,
  log: AppLog,
  format?: ThirdPartyFormat | 'openrouter'
) => AsyncGenerator<
  { error: string } | { error?: undefined; token: string } | Completion,
  Completion | undefined
>

export type CompletionItem = { role: ChatRole; content: string; name?: string }

export type CompletionContent<T> = Array<
  { finish_reason: string; index: number } & ({ text: string } | T)
>
export type Inference = { message: { content: string; role: ChatRole } }
export type AsyncDelta = { delta: Partial<Inference['message']> }

export type GenerateRequestV2 = {
  requestId: string
  kind:
    | 'send'
    | 'send-event:world'
    | 'send-event:character'
    | 'send-event:hidden'
    | 'send-event:ooc'
    | 'ooc'
    | 'retry'
    | 'continue'
    | 'self'
    | 'summary'
    | 'request'
    | 'plain'
    | 'chat-query'
  chat: AppSchema.Chat
  user: AppSchema.User
  char: AppSchema.Character
  replyAs: AppSchema.Character
  sender: AppSchema.Profile
  members: AppSchema.Profile[]

  parts: PromptParts
  lines: string[]
  linesCount?: number
  text?: string
  settings?: Partial<AppSchema.GenSettings>
  replacing?: AppSchema.ChatMessage
  continuing?: AppSchema.ChatMessage
  characters: Record<string, AppSchema.Character>
  impersonate?: AppSchema.Character

  jsonSchema?: JsonField[]
  reschemaPrompt?: string
  jsonValues?: Record<string, any>

  /** Base64 */
  imageData?: string

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
  chat: AppSchema.Chat
  char: AppSchema.Character
  replyAs: AppSchema.Character
  user: AppSchema.User
  members: AppSchema.Profile[]
  sender: AppSchema.Profile

  prompt: string
  messages?: Array<{ role: string; content: string }>

  parts: PromptParts
  lines: string[]
  retries?: string[]
  characters: Record<string, AppSchema.Character>
  impersonate: AppSchema.Character | undefined
  lastMessage?: string
  requestId: string
  encoder?: TokenCounter

  jsonSchema?: any
  reschemaPrompt?: string
  jsonValues: Record<string, any> | undefined

  imageData?: string
  guidance?: boolean
  placeholders?: Record<string, string>
  lists?: Record<string, string[]>
  previous?: Record<string, string>

  subscription?: {
    level: number
    preset?: AppSchema.SubscriptionModel
    error?: string
    warning?: string
  }

  /** GenSettings mapped to an object for the target adapter */
  gen: Partial<AppSchema.GenSettings>
  mappedSettings: any
  guest?: string
  log: AppLog
  isThirdParty?: boolean
  inserts?: Map<number, string>
  contextSize?: number
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
>
