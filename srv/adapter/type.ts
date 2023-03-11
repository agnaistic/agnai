import { AppSchema } from '../db/schema'
import { AppLog } from '../logger'

export type ModelAdapter = (opts: {
  chat: AppSchema.Chat
  char: AppSchema.Character
  user: AppSchema.User
  members: AppSchema.Profile[]
  sender: AppSchema.Profile
  prompt: string

  /** GenSettings mapped to an object for the target adapter */
  settings: any
  guest?: string
  log: AppLog
}) => AsyncGenerator<string | { error: any }>
