import type { PromptParts } from '../../common/prompt'
import { AppSchema } from '../../common/types/schema'
import { AppLog } from '../logger'
import { Memory } from '/common/types'

export type GenerateRequestV2 = {
  requestId: string
  kind:
    | 'send'
    | 'send-event:world'
    | 'send-event:character'
    | 'send-event:hidden'
    | 'ooc'
    | 'retry'
    | 'continue'
    | 'self'
    | 'summary'
    | 'request'
    | 'plain'
  chat: AppSchema.Chat
  user: AppSchema.User
  char: AppSchema.Character
  replyAs: AppSchema.Character
  sender: AppSchema.Profile
  members: AppSchema.Profile[]
  parts: PromptParts
  lines: string[]
  text?: string
  settings?: Partial<AppSchema.GenSettings>
  replacing?: AppSchema.ChatMessage
  continuing?: AppSchema.ChatMessage
  characters: Record<string, AppSchema.Character>
  impersonate?: AppSchema.Character

  /** Date ISO string */
  lastMessage?: string
  chatEmbeds?: Array<Memory.UserEmbed<{ name: string }>>
  userEmbeds?: Memory.UserEmbed[]
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
  parts: PromptParts
  lines: string[]
  characters?: Record<string, AppSchema.Character>
  impersonate: AppSchema.Character | undefined
  lastMessage?: string
  requestId: string

  /** GenSettings mapped to an object for the target adapter */
  gen: Partial<AppSchema.GenSettings>
  mappedSettings: any
  guest?: string
  log: AppLog
  isThirdParty?: boolean
}

export type ModelAdapter = (
  opts: AdapterProps
) => AsyncGenerator<string | { partial: string } | { error: any } | { meta: any } | { prompt: any }>
