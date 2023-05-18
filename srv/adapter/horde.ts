import * as horde from '../../common/horde-gen'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { HORDE_GUEST_KEY } from '../api/horde'
import { publishOne } from '../api/ws/handle'
import { decryptText } from '../db/util'
import { logger } from '../logger'
import { ModelAdapter } from './type'

export const handleHorde: ModelAdapter = async function* ({
  char,
  characters,
  members,
  prompt,
  user,
  gen,
  guest,
  ...opts
}) {
  try {
    const key = user.hordeKey
      ? guest
        ? user.hordeKey
        : decryptText(user.hordeKey)
      : HORDE_GUEST_KEY

    const text = await horde.generateText({ ...user, hordeKey: key }, gen, prompt)
    const sanitised = sanitise(text)
    const trimmed = trimResponseV2(sanitised, opts.replyAs, members, characters, ['END_OF_DIALOG'])

    // This is a temporary measure to help users provide more info when reporting instances of 'cut off' responses
    publishOne(user._id, { type: 'temp-horde-gen', original: sanitised, chatId: opts.chat._id })

    yield trimmed || sanitised
  } catch (ex: any) {
    logger.error({ err: ex, body: ex.body }, `Horde request failed.`)
    yield { error: `${ex.message}. ${ex?.body?.message}` }
  }
}
