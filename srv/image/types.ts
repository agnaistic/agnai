import { ImageSettings } from '../db/image-schema'
import { AppSchema } from '../db/schema'
import { AppLog } from '../logger'

export type ImageGenerateRequest = {
  user: AppSchema.User
  prompt: string
  chatId: string
}

export type ImageAdapter<T extends ImageSettings['type'] = ImageSettings['type']> = (
  opts: {
    user: AppSchema.User
    settings: Extract<ImageSettings, { type: T }>
    prompt: string
  },
  log: AppLog,
  guestId?: string
) => Promise<any>
