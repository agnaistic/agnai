import { AppSchema } from '../../db/schema'

export type ModelAdapter = (opts: {
  chat: AppSchema.Chat
  char: AppSchema.Character
  user: AppSchema.User
  members: AppSchema.Profile[]
  history: AppSchema.ChatMessage[]
  message: string
  sender: AppSchema.Profile
}) => AsyncGenerator<string | { error: any }>
