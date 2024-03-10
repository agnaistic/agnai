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
  noAffix?: boolean
  characterId?: string
}

export type ImageRequestOpts = {
  user: AppSchema.User
  prompt: string
  negative: string
}

export type ImageAdapter = (
  opts: ImageRequestOpts,
  log: AppLog,
  guestId?: string
) => Promise<ImageAdapterResponse>

export type ImageAdapterResponse = { ext: string; content: Buffer | string }
