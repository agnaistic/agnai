import { AppSchema } from '../db/schema'
import { AppLog } from '../logger'

export type AdapterProps = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  user: AppSchema.User
  members: AppSchema.Profile[]
  sender: AppSchema.Profile
  prompt: string
  lines?: string[]
  continuation?: boolean

  /** GenSettings mapped to an object for the target adapter */
  gen: Partial<AppSchema.GenSettings>
  settings: any
  guest?: string
  log: AppLog
}

export type ModelAdapter = (opts: AdapterProps) => AsyncGenerator<string | { error: any }>
