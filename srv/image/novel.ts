import needle from 'needle'
import { ImageAdapter } from './types'
import { decryptText } from '../db/util'
import { NOVEL_IMAGE_MODELS } from '../../common/image'

const baseUrl = `https://api.novelai.net/v1`

export const handleNovelImage: ImageAdapter = async (opts) => {
  const key = opts.guestId ? opts.user.novelApiKey : decryptText(opts.user.novelApiKey)
  const result = await needle(
    'post',
    `${baseUrl}/generate-image`,
    {
      action: 'generate',
      input: 'people in a park',
      model: NOVEL_IMAGE_MODELS.Full,
    },
    {
      json: true,
      headers: {
        Authorization: `Bearer ${key}`,
      },
    }
  )
}
