import needle from 'needle'
import { ImageAdapter } from './types'
import { decryptText } from '../db/util'
import { SD_SAMPLER } from '../../common/image'
import { HordeSettings } from '../db/image-schema'
import { HORDE_GUEST_KEY } from '../api/horde'
import { logger } from '../logger'
import { config } from '../config'
import { sendGuest, sendOne } from '../api/ws'

const negative_prompt = `disfigured, ugly, deformed, poorly, censor, censored, blurry, lowres, fused, malformed, watermark, misshapen, duplicated, grainy, distorted, signature`

const defaultSettings: HordeSettings = {
  type: 'horde',
  sampler: SD_SAMPLER['DPM++ 2M'],
  model: 'Deliberate',
}

const baseUrl = 'https://horde.koboldai.net/api/v2'

type HordeRequest = {
  prompt: string
  censor_nsfw: boolean
  models: [string]
  nsfw: boolean
  params: {
    cfg_scale: number
    height: number
    width: number
    karras: boolean
    n: number

    post_processing: any[]
    sampler_name: string
    seed: string
    steps: number
  }
  r2: boolean
  replacement_filter: boolean
  trusted_workers: boolean
}

export const handleHordeImage: ImageAdapter = async ({ user, prompt }, log, guestId) => {
  const base = user.images
  const settings = user.images?.horde || defaultSettings

  const payload: HordeRequest = {
    prompt: `${prompt} ### ${negative_prompt}`,
    params: {
      height: base?.height ?? 384,
      width: base?.width ?? 384,
      cfg_scale: base?.cfg ?? 9,
      seed: Math.trunc(Math.random() * 1_000_000_000).toString(),
      karras: false,
      n: 1,
      post_processing: [],
      sampler_name: settings.sampler ?? defaultSettings.sampler,
      steps: base?.steps ?? 28,
    },
    censor_nsfw: false,
    nsfw: true,
    models: [settings.model || 'stable_diffusion'],
    r2: false,
    replacement_filter: true,
    trusted_workers: user.hordeUseTrusted ?? false,
  }

  const key = user.hordeKey
    ? guestId
      ? user.hordeKey
      : decryptText(user.hordeKey)
    : HORDE_GUEST_KEY
  const headers = { apikey: key }

  const init = await needle('post', `${baseUrl}/generate/async`, payload, {
    json: true,
    headers,
  }).catch((err) => ({ error: err }))

  if ('error' in init) {
    throw new Error(`Failed to generate image (Horde): ${init.error.message || init.error}`)
  }

  if (init.statusCode && init.statusCode >= 400) {
    logger.error({ error: init.body }, `Horde request failed`)
    throw new Error(`Failed to generate image (Horde): ${init.statusMessage}`)
  }

  if (init.body.message) {
    throw new Error(`Horde request failed: ${init.body.message}`)
  }

  const id = init.body.id
  const started = Date.now()
  await wait(1)

  let text = ''
  let checks = 0
  let etaSent = false

  const MAX_WAIT_MS = config.horde.imageWaitSecs * 1000

  while (true) {
    const diff = Date.now() - started
    if (diff > MAX_WAIT_MS) {
      throw new Error(`Horde request failed: Timed out.`)
    }

    const check = await needle('get', `${baseUrl}/generate/status/${id}`, {
      json: true,
    }).catch((error) => ({ error }))

    if ('error' in check) {
      logger.error({ error: check.error }, `Horde request failed (check)`)
      throw new Error(`Horde request failed: ${check.error}`)
    }

    if (check.statusCode && check.statusCode >= 400) {
      logger.error({ error: check.body }, `Horde request failed (${check.statusCode})`)
      throw new Error(`Horde request failed: ${check.statusMessage}`)
    }

    if (check.body.faulted) {
      logger.error({ error: check.body }, `Horde request failed: Job faulted`)
      throw new Error(`Horde request failed: Job faulted`)
    }

    if (!check.body.done) {
      checks++
      if (!etaSent) {
        const message = {
          type: 'message-horde-eta',
          eta: check.body.wait_time,
          queue: check.body.queue_position,
        }
        if (message.eta > 0 || message.queue > 0) {
          etaSent = true
          if (guestId) sendGuest(guestId, message)
          else sendOne(user._id, message)
        }
      }
      await wait(2.5)
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

      if (guestId) sendGuest(guestId, payload)
      else sendOne(user._id, payload)

      const image = check.body.generations[0].img
      if (!image) {
        throw new Error(`Failed to generate image: Novel response did not contain an image`)
      }

      const buffer = Buffer.from(image, 'base64')
      return { ext: 'png', content: buffer }
    }
  }
}

function wait(secs = 2) {
  return new Promise((resolve) => setTimeout(resolve, secs * 1000))
}
