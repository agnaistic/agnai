import type { PromptParts } from '../../common/prompt'
import { AppSchema } from '../db/schema'
import { AppLog } from '../logger'

export type GenerateRequestV2 = {
  kind: 'send' | 'retry' | 'continue' | 'self'
  chat: AppSchema.Chat
  user: AppSchema.User
  char: AppSchema.Character
  sender: AppSchema.Profile
  members: AppSchema.Profile[]
  parts: PromptParts
  lines: string[]
  text?: string
  settings?: Partial<AppSchema.GenSettings>
  replacing?: AppSchema.ChatMessage
  continuing?: AppSchema.ChatMessage
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
  user: AppSchema.User
  members: AppSchema.Profile[]
  sender: AppSchema.Profile
  prompt: string
  parts: PromptParts
  lines: string[]

  /** GenSettings mapped to an object for the target adapter */
  gen: Partial<AppSchema.GenSettings>
  settings: any
  guest?: string
  log: AppLog
  isThirdParty?: boolean
}

export type ModelAdapter = (opts: AdapterProps) => AsyncGenerator<string | { error: any }>
