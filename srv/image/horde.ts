import * as horde from '../../common/horde-gen'
import { ImageAdapter } from './types'
import { decryptText } from '../db/util'
import { HORDE_GUEST_KEY } from '../api/horde'

export const handleHordeImage: ImageAdapter = async ({ user, prompt, negative }, log, guestId) => {
  const key = user.hordeKey
    ? guestId
      ? user.hordeKey
      : decryptText(user.hordeKey)
    : HORDE_GUEST_KEY

  const { text: image } = await horde.generateImage(
    { ...user, hordeKey: key },
    prompt,
    negative,
    log
  )
  const buffer = Buffer.from(image, 'base64')
  return { ext: 'png', content: buffer }
}
