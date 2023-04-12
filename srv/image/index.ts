import { ImageGenerateRequest } from './types'
import { AppLog } from '../logger'
import { handleNovelImage } from './novel'

export async function generateImage(opts: ImageGenerateRequest, log: AppLog, guestId?: string) {
  await handleNovelImage({ ...opts, log, guestId })
}
