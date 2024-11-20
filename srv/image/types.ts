import { AppSchema } from '../../common/types/schema'
import { AppLog } from '../middleware'
import { ImageSettings } from '/common/types/image-schema'

export type ImageGenerateRequest = {
  user: AppSchema.User
  prompt: string

  /** Prompt without any prefix or suffix applied */
  raw_prompt?: string

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
  params?: {
    clip_skip?: number
    cfg_scale?: number
    width?: number
    height?: number
    negative?: string
    steps?: number
    sampler?: string
    seed?: number
  }
}

export type ImageRequestOpts = {
  user: AppSchema.User
  prompt: string
  negative: string
  settings: ImageSettings | undefined
  override?: string
  raw_prompt: string | undefined
  params?: ImageGenerateRequest['params']
}

export type ImageAdapter = (
  opts: ImageRequestOpts,
  log: AppLog,
  guestId?: string
) => Promise<ImageAdapterResponse>

export type ImageAdapterResponse = { ext: string; content: Buffer | string }
