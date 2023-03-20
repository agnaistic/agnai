import needle from 'needle'
import { defaultPresets } from '../../common/presets'
import { decryptText } from '../db/util'
import { logger } from '../logger'
import { sanitise, trimResponse, trimResponseV2 } from '../api/chat/common'
import { getHordeWorkers, HORDE_GUEST_KEY } from '../api/horde'
import { sendGuest, sendOne } from '../api/ws'
import { ModelAdapter } from './type'

const REQUIRED_SAMPLERS = defaultPresets.basic.order

const baseUrl = 'https://stablehorde.net/api/v2'

const base = { n: 1 }
const defaultModel = 'PygmalionAI/pygmalion-6b'

export const handleHorde: ModelAdapter = async function* ({
  char,
  members,
  prompt,
  user,
  sender,
  settings,
  guest,
  log,
}) {
  if (!user.hordeModel) {
    yield { error: `Horde request failed: Not configured` }
    return
  }

  const body = {
    // An empty models array will use any model
    models: [user.hordeModel || defaultModel].filter((m) => !!m),
    prompt,
    workers: [] as string[],
  }

  const availableWorkers = getHordeWorkers()
  for (const workerId of user.hordeWorkers || []) {
    const match = availableWorkers.some((w) => w.id === workerId)
    if (match) {
      body.workers.push(workerId)
    }
  }

  const key = user.hordeKey ? (guest ? user.hordeKey : decryptText(user.hordeKey)) : HORDE_GUEST_KEY
  const params = { ...base, ...settings }

  // Kobold sampler order parameter must contain all 6 samplers to be valid
  // If the sampler order is provided, but incomplete, add the remaining samplers.
  if (params.sampler_order && params.sampler_order.length !== 6) {
    for (const sampler of REQUIRED_SAMPLERS) {
      if (params.sampler_order.includes(sampler)) continue

      params.sampler_order.push(sampler)
    }
  }

  const headers = { apikey: key, 'Client-Agent': 'KoboldAiLite:11' }

  log.debug(body, 'Horde payload')

  const init = await needle(
    'post',
    `${baseUrl}/generate/text/async`,
    { ...body, params },
    { json: true, headers }
  ).catch((err) => ({ error: err }))

  if ('error' in init) {
    yield { error: `Horde request failed: ${init.error.message || init.error}` }
    return
  }

  if (init.statusCode && init.statusCode >= 400) {
    yield { error: `Horde request failed: ${init.statusMessage}` }
    logger.error({ error: init.body }, `Horde request failed`)
    return
  }

  if (init.body.message) {
    yield { error: `Horde request failed: ${init.body.message}` }
    return
  }

  const id = init.body.id
  const started = Date.now()
  await wait(1)

  let text = ''
  let checks = 0

  while (true) {
    const diff = Date.now() - started
    if (diff > 120000) {
      yield { error: `Horde request failed: Timed out` }
      return
    }

    const check = await needle('get', `${baseUrl}/generate/text/status/${id}`, {
      json: true,
    }).catch((error) => ({ error }))

    if ('error' in check) {
      logger.error({ error: check.error }, `Horde request failed (check)`)
      yield { error: `Horde request failed: ${check.error}` }
      return
    }

    if (check.statusCode && check.statusCode >= 400) {
      logger.error({ error: check.body }, `Horde request failed (${check.statusCode})`)
      yield { error: `Horde request failed: ${check.statusMessage}` }
      return
    }

    if (check.body.faulted) {
      logger.error({ error: check.body }, `Horde request failed: Job faulted`)
      yield { error: `Horde request failed: Job faulted` }
      continue
    }

    if (!check.body.done) {
      checks++
      if (checks === 1) {
        if (guest) sendGuest(guest, { type: 'message-horde-eta', eta: check.body.wait_time })
        else sendOne(sender.userId, { type: 'message-horde-eta', eta: check.body.wait_time })
      }
      await wait()
      continue
    }

    if (check.body.generations.length) {
      text = check.body.generations[0].text
      break
    }
  }

  const sanitised = sanitise(text)
  const trimmed = trimResponseV2(sanitised, char, members, ['END_OF_DIALOG'])
  yield trimmed || sanitised
}

function wait(secs = 2) {
  return new Promise((resolve) => setTimeout(resolve, secs * 1000))
}
