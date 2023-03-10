import { AppSchema } from '../../db/schema'
import { AppLog } from '../../logger'

export type ModelAdapter = (opts: {
  chat: AppSchema.Chat
  char: AppSchema.Character
  user: AppSchema.User
  members: AppSchema.Profile[]
  sender: AppSchema.Profile
  prompt: string
  settings: Omit<AppSchema.GenSettings, 'name'>
  guest?: boolean
  log: AppLog
}) => AsyncGenerator<string | { error: any }>
