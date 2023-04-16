import { ImageSettings } from '../db/image-schema'
import { AppSchema } from '../db/schema'
import { AppLog } from '../logger'

export type ImageGenerateRequest = {
  user: AppSchema.User
  prompt: string
  chatId: string
  messageId?: string
}

export type ImageAdapter = (
  opts: {
    user: AppSchema.User
    prompt: string
  },
  log: AppLog,
  guestId?: string
) => Promise<ImageAdapterResponse>

export type ImageAdapterResponse = { ext: string; content: Buffer }
