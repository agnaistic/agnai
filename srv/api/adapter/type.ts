import { AppSchema } from '../../db/schema'

export type ModelAdapter = (
  chat: AppSchema.Chat,
  character: AppSchema.Character,
  history: AppSchema.ChatMessage[],
  message: string
) => AsyncGenerator<string>
