import { AppSchema } from '../db/schema'
import { AppLog } from '../logger'

export type ImageGenerateRequest = {
  chat: AppSchema.Chat
  user: AppSchema.User
  char: AppSchema.Character
  sender: AppSchema.Profile
  lines: string[]
}

export type ImageAdapter = (
  opts: ImageGenerateRequest & { log: AppLog; guestId?: string }
) => Promise<void>
