import { AppSchema } from '../../db/schema'

export type ModelAdapter = (opts: {
  chat: AppSchema.Chat
  char: AppSchema.Character
  user: AppSchema.User
  members: AppSchema.Profile[]
  message: string
  sender: AppSchema.Profile
  prompt: string
  settings: AppSchema.GenSettings
}) => AsyncGenerator<string | { error: any }>
