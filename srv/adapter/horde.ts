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

    const endTokens = new Set(['END_OF_DIALOG'])

    for (const character of Object.values(characters!)) {
      const endTokenToAdd = `${character.name}:`
  
      if (opts.replyAs === character) {
        endTokens.delete(endTokenToAdd);
      } else if (!endTokens.has(endTokenToAdd)) {
        endTokens.add(endTokenToAdd);
      }
    }

    const text = await horde.generateText({ ...user, hordeKey: key }, gen, prompt)
    const sanitised = sanitise(text)
    
    const trimmed = trimResponseV2(sanitised, opts.replyAs, members, Array.from(endTokens))
    
    // This is a temporary measure to help users provide more info when reporting instances of 'cut off' responses
    publishOne(user._id, { type: 'temp-horde-gen', original: sanitised, chatId: opts.chat._id })

    yield trimmed || sanitised
  } catch (ex: any) {
    logger.error({ err: ex, body: ex.body }, `Horde request failed.`)
    yield { error: `${ex.message}. ${ex?.body?.message}` }
  }
}
