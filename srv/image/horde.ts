import * as horde from '../../common/horde-gen'
import { ImageAdapter } from './types'
import { decryptText } from '../db/util'
import { HORDE_GUEST_KEY } from '../api/horde'
import { HordeCheck } from '../../common/horde-gen'
import { sendGuest, sendOne } from '../api/ws'
import { AppSchema } from '/common/types'

export const handleHordeImage: ImageAdapter = async ({ user, prompt, negative }, log, guestId) => {
  let key = getHordeKey(user, !!guestId)

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

function getHordeKey(user: AppSchema.User, guest: boolean) {
  let key = user.hordeKey
  const match = user.providers?.find((p) => p.provider === 'known-horde')

  if (match?.key) {
    key = match.key
  }

  if (key) {
    return guest ? key : decryptText(key)
  }

  return HORDE_GUEST_KEY
}
