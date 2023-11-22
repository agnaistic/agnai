import { AppSchema } from '../../common/types/schema'
import { AppLog } from '../logger'

export type ImageGenerateRequest = {
  user: AppSchema.User
  prompt: string
  chatId?: string
  messageId?: string
  ephemeral?: boolean
  append?: boolean
  source: string
}

export type ImageAdapter = (
  opts: {
    user: AppSchema.User
    prompt: string
    negative: string
  },
  log: AppLog,
  guestId?: string
) => Promise<ImageAdapterResponse>

export type ImageAdapterResponse = { ext: string; content: Buffer }
