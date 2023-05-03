import * as horde from '../../common/horde-gen'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { HORDE_GUEST_KEY } from '../api/horde'
import { decryptText } from '../db/util'
import { logger } from '../logger'
import { ModelAdapter } from './type'

export const handleHorde: ModelAdapter = async function* ({
  char,
  members,
  prompt,
  user,
  gen,
  guest,
}) {
  try {
    const key = user.hordeKey
      ? guest
        ? user.hordeKey
        : decryptText(user.hordeKey)
      : HORDE_GUEST_KEY

    const text = await horde.generateText({ ...user, hordeKey: key }, gen, prompt)
    const sanitised = sanitise(text)
    const trimmed = trimResponseV2(sanitised, char, members, ['END_OF_DIALOG'])
    yield trimmed || sanitised
  } catch (ex: any) {
    logger.error({ err: ex, body: ex.body }, `Horde request failed`)
    yield { error: ex.message }
  }
}
