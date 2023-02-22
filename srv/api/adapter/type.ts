import { AppSchema } from '../../db/schema'

export type ModelAdapter = (opts: {
  chat: AppSchema.Chat
  char: AppSchema.Character
  history: AppSchema.ChatMessage[]
  message: string
  settings: AppSchema.Settings
}) => AsyncGenerator<string | { error: any }>
