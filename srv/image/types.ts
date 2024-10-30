import { AppSchema } from '../../common/types/schema'
import { AppLog } from '../middleware'
import { ImageSettings } from '/common/types/image-schema'

export type ImageGenerateRequest = {
  user: AppSchema.User
  prompt: string
  source: string

  sync?: boolean
  chatId?: string
  model?: string
  messageId?: string
  ephemeral?: boolean
  append?: boolean
  noAffix?: boolean
  characterId?: string
  requestId?: string
  parentId: string | undefined
}

export type ImageRequestOpts = {
  user: AppSchema.User
  prompt: string
  negative: string
  settings: ImageSettings | undefined
  override?: string
}

export type ImageAdapter = (
  opts: ImageRequestOpts,
  log: AppLog,
  guestId?: string
) => Promise<ImageAdapterResponse>

export type ImageAdapterResponse = { ext: string; content: Buffer | string }
