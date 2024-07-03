import { AppSchema } from '../../common/types/schema'
import { AppLog } from '../logger'
import { BaseImageSettings } from '/common/types/image-schema'

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
  requestId?: string
}

export type ImageRequestOpts = {
  user: AppSchema.User
  prompt: string
  negative: string
  settings: BaseImageSettings | undefined
}

export type ImageAdapter = (
  opts: ImageRequestOpts,
  log: AppLog,
  guestId?: string
) => Promise<ImageAdapterResponse>

export type ImageAdapterResponse = { ext: string; content: Buffer | string }
