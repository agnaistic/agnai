import needle from 'needle'
import { ImageAdapter, ImageRequestOpts } from './types'
import { SD_SAMPLER, SD_SAMPLER_REV } from '../../common/image'
import { SDSettings } from '../../common/types/image-schema'
import { logger } from '../middleware'
import { AppSchema } from '/common/types/schema'
import { store } from '../db'
import { getUserSubscriptionTier } from '/common/util'
import { getCachedTiers } from '../db/subscriptions'
import { config } from '../config'
import { fixImagePrompt } from '/common/image-prompt'

const defaultSettings: SDSettings = {
  type: 'sd',
  sampler: SD_SAMPLER['DPM++ 2M'],
  url: 'http://localhost:7860',
}

export type SDRequest = {
  seed: number
  sampler_name: string
  n_iter: number
  clip_skip: number
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
  model_override?: string
}

export const handleSDImage: ImageAdapter = async (opts, log, guestId) => {
  const config = await getConfig(opts)
  const payload = getPayload(config.kind, opts, config.model, config.temp)

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

async function getConfig({ user, settings, override }: ImageRequestOpts): Promise<{
  kind: 'user' | 'agnai'
  host: string
  params?: string
  model?: AppSchema.ImageModel
  temp?: AppSchema.ImageModel
}> {
  const type = settings?.type || user.images?.type

  // Stable Diffusion URL always comes from user settings
  const userHost = user.images?.sd.url || defaultSettings.url
  if (type !== 'agnai') {
    return { kind: 'user', host: userHost }
  }

  const srv = await store.admin.getServerConfiguration()
  if (!srv.imagesEnabled || !srv.imagesHost) {
    return { kind: 'user', host: userHost }
  }

  const sub = getUserSubscriptionTier(user, getCachedTiers())
  if (!sub?.tier?.imagesAccess && !user.admin) return { kind: 'user', host: userHost }

  const models = getAgnaiModels(srv.imagesModels)

  const temp = override ? models.find((m) => m.id === override || m.name === override) : undefined

  const match = models.find((m) => {
    return m.id === settings?.agnai?.model || m.name === settings?.agnai?.model
  })

  const model = models.length === 1 ? models[0] : match ?? models[0]

  if (!temp && !model) {
    return { kind: 'user', host: userHost }
  }

  const params = [
    `type=image`,
    `key=${config.auth.inferenceKey}`,
    `id=${user._id}`,
    `level=${user.admin ? 99999 : sub?.level ?? -1}`,
    `model=${temp?.name || model.name}`,
  ]

  return {
    kind: 'agnai',
    host: srv.imagesHost,
    params: `?${params.join('&')}`,
    model: temp || model,
    temp,
  }
}

function getPayload(
  kind: 'agnai' | 'user',
  opts: ImageRequestOpts,
  model: AppSchema.ImageModel | undefined,
  temp: AppSchema.ImageModel | undefined
) {
  const sampler =
    (kind === 'agnai' ? opts.settings?.agnai?.sampler : opts.settings?.sd?.sampler) ||
    defaultSettings.sampler

  const payload: SDRequest = {
    prompt: opts.prompt,
    // enable_hr: true,
    // hr_scale: 1.5,
    // hr_second_pass_steps: 15,
    // hr_upscaler: "",
    clip_skip: opts.params?.clip_skip ?? opts.settings?.clipSkip ?? model?.init.clipSkip ?? 0,
    height: opts.params?.height ?? opts.settings?.height ?? model?.init.height ?? 1024,
    width: opts.params?.width ?? opts.settings?.width ?? model?.init.width ?? 1024,
    n_iter: 1,
    batch_size: 1,
    negative_prompt: opts.params?.negative ?? opts.negative,
    sampler_name: (SD_SAMPLER_REV as any)[opts.params?.sampler ?? sampler],
    cfg_scale: opts.params?.cfg_scale ?? opts.settings?.cfg ?? model?.init.cfg ?? 9,
    seed: Math.trunc(Math.random() * 1_000_000_000),
    steps: opts.params?.steps ?? opts.settings?.steps ?? model?.init.steps ?? 28,
    restore_faces: false,
    save_images: false,
    send_images: true,
    model_override: temp ? temp.override : model?.override,
  }

  if (model) {
    payload.steps = Math.min(+model.limit.steps, payload.steps)
    payload.cfg_scale = Math.min(+model.limit.cfg, payload.cfg_scale)
    payload.width = Math.min(+model.limit.width, payload.width)
    payload.height = Math.min(+model.limit.height, payload.height)
  }

  const rec = opts.user.useRecommendedImages
  if (rec && rec !== 'none' && model) {
    const init = model.init
    if (init.cfg) payload.cfg_scale = +init.cfg
    if (init.clipSkip !== undefined) payload.clip_skip = +init.clipSkip
    if (init.steps) payload.steps = +init.steps

    if (!rec.includes('size')) {
      payload.width = +init.width
      payload.height = +init.height
    }

    if (!rec.includes('affix')) {
      const prompt = [
        init.prefix || opts.settings?.prefix,
        opts.raw_prompt,
        init.suffix || opts.settings?.suffix,
      ].join(',')

      payload.prompt = fixImagePrompt(prompt)

      if (init.negative) {
        payload.negative_prompt = init.negative
      }
    }
  }

  // width and height must be divisible by 64
  payload.width = Math.ceil(payload.width / 32) * 32
  payload.height = Math.ceil(payload.height / 32) * 32

  return payload
}

function getAgnaiModels(csv: AppSchema.Configuration['imagesModels']) {
  return csv
}
