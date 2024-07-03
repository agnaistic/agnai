import Zip from 'adm-zip'
import needle from 'needle'
import { ImageAdapter } from './types'
import { decryptText } from '../db/util'
import { NOVEL_IMAGE_MODEL, NOVEL_SAMPLER } from '../../common/image'
import { NovelSettings } from '../../common/types/image-schema'

const baseUrl = `https://image.novelai.net/ai`

const defaultSettings: NovelSettings = {
  type: 'novel',
  model: NOVEL_IMAGE_MODEL.Full,
  sampler: NOVEL_SAMPLER['DPM++ 2M'],
}

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

export const handleNovelImage: ImageAdapter = async ({ user, prompt, negative }, log, guestId) => {
  const base = user.images
  const settings = user.images?.novel || defaultSettings
  const key = guestId ? user.novelApiKey : decryptText(user.novelApiKey)
  let input = prompt

  if (!prompt.includes('nsfw')) {
    input = 'nsfw, ' + prompt
  }

  if (base?.template) {
    input = base.template.replace(/\{\{prompt\}\}/g, prompt)
    if (!input.includes(prompt)) {
      input = prompt + ' ' + input
    }
  }

  const payload: NovelImageRequest = {
    action: 'generate',
    input,
    model: settings.model ?? NOVEL_IMAGE_MODEL.Full,
    parameters: {
      height: base?.height ?? 384,
      width: base?.width ?? 384,
      n_samples: 1,
      negative_prompt: negative,
      sampler: settings.sampler ?? NOVEL_SAMPLER['DPM++ 2M'],
      scale: base?.cfg ?? 9,
      seed: Math.trunc(Math.random() * 1_000_000_000),
      steps: base?.steps ?? 28,
      // Unsure what to do with these two values
      ucPreset: 0,
      qualityToggle: false,
    },
  }
  const result = await needle('post', `${baseUrl}/generate-image`, payload, {
    json: true,
    headers: {
      Authorization: `Bearer ${key}`,
    },
  })

  if (result.statusCode && result.statusCode >= 400) {
    throw new Error(
      `Failed to generate image: ${result.body.message || result.statusMessage} (${
        result.statusCode
      })`
    )
  }

  const zip = new Zip(result.body).getEntries()
  const entry = zip.find((entry) => entry.entryName.endsWith('.png'))

  if (!entry) {
    throw new Error(`Failed to generate image: Novel response did not contain an image`)
  }

  return { ext: 'png', content: entry.getData() }
}
