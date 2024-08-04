import * as horde from '../../common/horde-gen'
import { ImageAdapter } from './types'
import { decryptText } from '../db/util'
import { HORDE_GUEST_KEY } from '../api/horde'
import { HordeCheck } from '../../common/horde-gen'
import { sendGuest, sendOne } from '../api/ws'

export const handleHordeImage: ImageAdapter = async ({ user, prompt, negative }, log, guestId) => {
  const key = user.hordeKey
    ? guestId
      ? user.hordeKey
      : decryptText(user.hordeKey)
    : HORDE_GUEST_KEY

  const onTick = (status: HordeCheck) => {
    const payload = {
      type: 'horde-status',
      status,
    }
    if (guestId) {
      sendGuest(guestId, payload)
    } else {
      sendOne(user._id, payload)
    }
  }

  const { text: image } = await horde.generateImage(
    { ...user, hordeKey: key },
    prompt,
    negative,
    onTick,
    log
  )
  const buffer = Buffer.from(image, 'base64')
  return { ext: 'png', content: buffer }
}
