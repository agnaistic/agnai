import needle from 'needle'
import { ImageAdapter } from './types'
import { SD_SAMPLER, SD_SAMPLER_REV } from '../../common/image'
import { SDSettings } from '../../common/types/image-schema'
import { logger } from '../logger'

const defaultSettings: SDSettings = {
  type: 'sd',
  sampler: SD_SAMPLER['DPM++ 2M'],
  url: 'http://localhost:7860',
}

type SDRequest = {
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

export const handleSDImage: ImageAdapter = async ({ user, prompt, negative }, log, guestId) => {
  const base = user.images
  const settings = user.images?.sd || defaultSettings

  const payload: SDRequest = {
    prompt,
    // enable_hr: true,
    // hr_scale: 1.5,
    // hr_second_pass_steps: 15,
    // hr_upscaler: "",
    height: base?.height ?? 384,
    width: base?.width ?? 384,
    n_iter: 1,
    batch_size: 1,
    negative_prompt: negative,
    sampler_name: (SD_SAMPLER_REV as any)[settings.sampler ?? defaultSettings.sampler],
    cfg_scale: base?.cfg ?? 9,
    seed: Math.trunc(Math.random() * 1_000_000_000),
    steps: base?.steps ?? 28,
    restore_faces: false,
    save_images: false,
    send_images: true,
  }

  logger.debug(payload, 'Image: Stable Diffusion payload')

  const result = await needle('post', `${settings.url}/sdapi/v1/txt2img`, payload, {
    json: true,
  })

  if (result.statusCode && result.statusCode >= 400) {
    throw new Error(
      `Failed to generate image: ${result.body.message || result.statusMessage} (${
        result.statusCode
      })`
    )
  }

  const image = result.body.images[0]
  if (!image) {
    throw new Error(`Failed to generate image: Novel response did not contain an image`)
  }

  const buffer = Buffer.from(image, 'base64')

  return { ext: 'png', content: buffer }
}
