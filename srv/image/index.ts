import { ImageGenerateRequest } from './types'
import { AppLog } from '../logger'
import { handleNovelImage } from './novel'
import { store } from '../db'
import { publishGuest, publishMany } from '../api/ws/handle'
import { NovelSettings } from '../db/image-schema'
import { NOVEL_IMAGE_MODEL } from '../../common/image'
import { NOVEL_SAMPLER } from '../../common/image'

const defaultSettings: NovelSettings = {
  type: 'novel',
  model: NOVEL_IMAGE_MODEL.Full,
  sampler: NOVEL_SAMPLER.DPMPP_2M,
  template: 'people in a park',
  height: 512,
  width: 512,
  steps: 28,
}

export async function generateImage(
  { user, prompt, chatId }: ImageGenerateRequest,
  log: AppLog,
  guestId?: string
) {
  const broadcastIds: string[] = []

  if (!guestId) {
    broadcastIds.push(user._id)
    const members = await store.chats.getActiveMembers(chatId)
    broadcastIds.push(...members)
  }

  let image: any
  let error: any

  try {
    switch (user.images?.type) {
      case 'novel':
        image = await handleNovelImage({ user, settings: user.images, prompt }, log, guestId)
        break

      default:
        image = await handleNovelImage({ user, settings: defaultSettings, prompt }, log, guestId)
        break
    }
  } catch (ex: any) {
    error = ex.message || ex
  }

  const message = image
    ? { type: 'image-generated', chatId, image }
    : { type: 'image-failed', chatId, error: error || 'Invalid image settings (No handler found)' }

  if (broadcastIds.length) {
    publishMany(broadcastIds, message)
  } else if (guestId) {
    publishGuest(guestId, message)
  }
}
