import needle from 'needle'
import { ImageAdapter } from './types'
import { decryptText } from '../db/util'
import { NOVEL_IMAGE_MODEL, NOVEL_SAMPLER, NovelImageModel } from '../../common/image'

const baseUrl = `https://api.novelai.net/ai`

const negative_prompt = `disfigured, ugly, deformed, poorly, censor, censored, blurry, lowres, fused, malformed, watermark, misshapen, duplicated, grainy, distorted, signature`

type NovelImageRequest = {
  action: 'generate'
  input: string
  model: string
  parameters: {
    height: number
    width: number
    n_samples: number
    negative_prompt: string
    ucPreset: number
    qualityToggle: boolean

    sampler: string
    seed: number

    /** Sampling steps */
    steps: number
    /** CFG scale */
    scale: number
  }
}

export const handleNovelImage: ImageAdapter<'novel'> = async (
  { user, settings, prompt },
  log,
  guestId
) => {
  const key = guestId ? user.novelApiKey : decryptText(user.novelApiKey)

  const payload: NovelImageRequest = {
    action: 'generate',
    input: prompt,
    model: settings.model ?? NOVEL_IMAGE_MODEL.Full,
    parameters: {
      height: settings.height ?? 512,
      width: settings.width ?? 512,
      n_samples: 1,
      negative_prompt,
      sampler: settings.sampler ?? NOVEL_SAMPLER.DPMPP_2M,
      scale: 9,
      seed: Math.random() * 1_000_000_000,
      steps: settings.steps ?? 28,
      ucPreset: 0,
      qualityToggle: true,
    },
  }
  const result = await needle('post', `${baseUrl}/generate-image`, payload, {
    json: true,
    headers: {
      Authorization: `Bearer ${key}`,
    },
  })

  return result
}
