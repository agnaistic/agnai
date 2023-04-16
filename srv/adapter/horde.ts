import needle from 'needle'
import { defaultPresets } from '../../common/presets'
import { decryptText } from '../db/util'
import { logger } from '../logger'
import { sanitise, trimResponseV2 } from '../api/chat/common'
import { getHordeWorkers, HORDE_GUEST_KEY } from '../api/horde'
import { sendGuest, sendOne } from '../api/ws'
import { ModelAdapter } from './type'
import { config } from '../config'

const REQUIRED_SAMPLERS = defaultPresets.basic.order

const baseUrl = 'https://horde.koboldai.net/api/v2'

const base = { n: 1 }

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
    models: [] as string[],
    prompt,
    workers: [] as string[],
    trusted_workers: user.hordeUseTrusted ?? false,
  }

  if (user.hordeModel && user.hordeModel !== 'any') {
    body.models.push(user.hordeModel)
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

  const headers = { apikey: key }

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
  let sentEta = false

  const MAX_WAIT_MS = config.horde.maxWaitSecs * 1000

  while (true) {
    const diff = Date.now() - started
    if (diff > MAX_WAIT_MS) {
      yield {
        error: `Horde request failed: Timed out. Try lowering your max_context and max_context_length.`,
      }
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
      if (!sentEta) {
        const msg = {
          type: 'message-horde-eta',
          eta: check.body.wait_time,
          queue: check.body.queue_position,
        }

        if (msg.queue > 0 || msg.eta > 0) {
          sentEta = true
          if (guest) sendGuest(guest, msg)
          else sendOne(sender.userId, msg)
        }
      }
      await wait()
      continue
    }

    if (check.body.generations.length) {
      const [gen] = check.body.generations
      text = gen.text
      const payload = {
        type: 'horde-response',
        model: gen.model,
        worker: gen.worker_name,
        worker_id: gen.worker_id,
      }
      if (guest) sendGuest(guest, payload)
      else sendOne(sender.userId, payload)
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
