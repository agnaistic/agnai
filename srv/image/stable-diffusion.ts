import needle from 'needle'
import { ImageAdapter, ImageRequestOpts } from './types'
import { SD_SAMPLER, SD_SAMPLER_REV } from '../../common/image'
import { SDSettings } from '../../common/types/image-schema'
import { logger } from '../logger'
import { AppSchema } from '/common/types/schema'
import { store } from '../db'
import { getUserSubscriptionTier } from '/common/util'
import { getCachedTiers } from '../db/subscriptions'
import { config } from '../config'

const defaultSettings: SDSettings = {
  type: 'sd',
  sampler: SD_SAMPLER['DPM++ 2M'],
  url: 'http://localhost:7860',
}

export type SDRequest = {
  seed: number
  sampler_name: string
  n_iter: number
  batch_size: number
  steps: number
  cfg_scale: number
  width: number
  height: number
  restore_faces: boolean
  negative_prompt: string
  send_images: boolean
  save_images: boolean
  prompt: string
  subseed?: number
  enable_hr?: boolean
  hr_scale?: number
  hr_upscaler?: string
  hr_second_pass_steps?: number
}

export const handleSDImage: ImageAdapter = async (opts, log, guestId) => {
  const { user } = opts
  const config = await getConfig(user)
  const payload = getPayload(opts, config.model)

  logger.debug(payload, 'Image: Stable Diffusion payload')

  const result = await needle(
    'post',
    `${config.host}/sdapi/v1/txt2img${config.params || ''}`,
    payload,
    { json: true }
  ).catch((err) => ({ err }))

  if ('err' in result) {
    if ('syscall' in result.err && 'code' in result.err) {
      throw new Error(`Image request failed: Service unreachable - ${result.err.code}`)
    }

    throw new Error(`Image request request failed: ${result.err.message || result.err}`)
  }

  if (result.statusCode && result.statusCode >= 400) {
    throw new Error(
      `Failed to generate image: ${result.body.message || result.statusMessage} (${
        result.statusCode
      })`
    )
  }

  const image = result.body.images[0]
  if (!image) {
    throw new Error(`Failed to generate image: Response did not contain an image`)
  }

  if (typeof image === 'string' && image.startsWith('http')) {
    return { ext: 'png', content: image }
  }

  const buffer = Buffer.from(image, 'base64')

  return { ext: 'png', content: buffer }
}

async function getConfig(user: AppSchema.User): Promise<{
  kind: 'user' | 'agnai'
  host: string
  params?: string
  model?: AppSchema.ImageModel
}> {
  const userHost = user.images?.sd.url || defaultSettings.url
  if (user.images?.type !== 'agnai') {
    return { kind: 'user', host: userHost }
  }

  const srv = await store.admin.getServerConfiguration()
  if (!srv.imagesEnabled || !srv.imagesHost) {
    return { kind: 'user', host: userHost }
  }

  const sub = getUserSubscriptionTier(user, getCachedTiers())
  if (!sub?.tier?.imagesAccess && !user.admin) return { kind: 'user', host: userHost }

  const models = getAgnaiModels(srv.imagesModels)
  const model =
    models.length === 1
      ? models[0]
      : models.find((m) => m.name === user.images?.agnai?.model) ?? models[0]

  if (!model) {
    return { kind: 'user', host: userHost }
  }

  const params = [
    `type=image`,
    `key=${config.auth.inferenceKey}`,
    `id=${user._id}`,
    `level=${user.admin ? 99999 : sub?.level ?? -1}`,
    `model=${model.name}`,
  ].join('&')

  return { kind: 'agnai', host: srv.imagesHost, params: `?${params}`, model }
}

function getPayload(opts: ImageRequestOpts, model?: AppSchema.ImageModel) {
  const sampler = opts.user.images?.sd.sampler || defaultSettings.sampler
  const payload: SDRequest = {
    prompt: opts.prompt,
    // enable_hr: true,
    // hr_scale: 1.5,
    // hr_second_pass_steps: 15,
    // hr_upscaler: "",
    height: opts.user.images?.height ?? model?.init.height ?? 384,
    width: opts.user?.images?.width ?? model?.init.width ?? 384,
    n_iter: 1,
    batch_size: 1,
    negative_prompt: opts.negative,
    sampler_name: (SD_SAMPLER_REV as any)[sampler],
    cfg_scale: opts.user.images?.cfg ?? model?.init.cfg ?? 9,
    seed: Math.trunc(Math.random() * 1_000_000_000),
    steps: opts.user.images?.steps ?? model?.init.steps ?? 28,
    restore_faces: false,
    save_images: false,
    send_images: true,
  }

  if (model) {
    payload.steps = Math.min(model.limit.steps, payload.steps)
    payload.cfg_scale = Math.min(model.limit.cfg, payload.cfg_scale)
    payload.width = Math.min(model.limit.width, payload.width)
    payload.height = Math.min(model.limit.height, payload.height)
  }

  // width and height must be divisible by 64
  payload.width = Math.floor(payload.width / 64) * 64
  payload.height = Math.floor(payload.height / 64) * 64

  return payload
}

function getAgnaiModels(csv: AppSchema.Configuration['imagesModels']) {
  return csv
}
