import { AppSchema } from '../../db/schema'

export type ModelAdapter = (opts: {
  chat: AppSchema.Chat
  char: AppSchema.Character
  user: AppSchema.User
  members: AppSchema.Profile[]
  sender: AppSchema.Profile
  prompt: string
  settings: Omit<AppSchema.GenSettings, 'name'>
}) => AsyncGenerator<string | { error: any }>
