import * as horde from '../../common/horde-gen'
import { HORDE_GUEST_KEY, getHordeModels } from '../api/horde'
import { sendOne } from '../api/ws'
import { decryptText } from '../db/util'
import { logger } from '../middleware'
import { ModelAdapter } from './type'
import { sanitise } from '/common/requests/util'
import { toArray } from '/common/util'

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
    let key = user.hordeKey ? (guest ? user.hordeKey : decryptText(user.hordeKey)) : HORDE_GUEST_KEY

    if (gen.providerId && gen.thirdPartyKey) {
      key = guest ? gen.thirdPartyKey : decryptText(gen.thirdPartyKey)
    }

    yield { prompt }

    const models = getHordeModels()
    const userModels = gen.providerId
      ? toArray(gen.thirdPartyModel?.split(','))
      : toArray(user.hordeModel)

    const userWorkers = gen.providerId
      ? toArray(gen.providerSettings?.[gen.providerId]?.workers)
      : toArray(user.hordeWorkers)

    const modelsMatch = models
      .filter((m) => {
        const lowered = m.name.toLowerCase()
        for (const um of userModels) {
          if (lowered.includes(um.toLowerCase())) return true
        }
        return false
      })
      .map((m) => m.name)

    user.hordeModel = modelsMatch.length > 0 ? userModels : 'any'
    user.hordeWorkers = userWorkers

    const result = await horde.generateText({ ...user, hordeKey: key }, gen, prompt, opts.log)
    const sanitised = sanitise(result.text)

    // This is a temporary measure to help users provide more info when reporting instances of 'cut off' responses
    sendOne(guest || user._id, {
      type: 'temp-horde-gen',
      original: sanitised,
      chatId: opts.chat._id,
    })

    const details = result.result.generations?.[0]

    if (details) {
      yield {
        meta: {
          workerId: details.worker_id,
          workerName: details.worker_name,
          model: details.model,
        },
      }
    }

    yield sanitised
  } catch (ex: any) {
    logger.error({ err: ex, body: ex.body }, `Horde request failed.`)
    let msg = [ex?.body?.message || '', JSON.stringify(ex?.body?.errors) || ''].filter(
      (line) => !!line
    )
    yield { error: `${ex.message}. ${msg.join('. ')}` }
  }
}
