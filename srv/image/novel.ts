import Zip from 'adm-zip'
import needle from 'needle'
import { ImageAdapter } from './types'
import { decryptText } from '../db/util'
import { NOVEL_IMAGE_MODEL, NOVEL_SAMPLER } from '../../common/image'
import { NovelSettings } from '../../common/types/image-schema'
import { formatImagePrompt, joinImagePrompts } from '/common/util'

const baseUrl = `https://image.novelai.net/ai`

const defaultSettings: NovelSettings = {
  type: 'novel',
  model: NOVEL_IMAGE_MODEL.Anime_v4_Curated,
  sampler: NOVEL_SAMPLER['DPM++ 2M'],
  ucPreset: '0',
  qualityTags: true,
}

const UC_PRESETS: Record<number, string> = {
  0: 'blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks, white blank page, blank page',
  1: 'blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, white blank page, blank page',
  2: '',
}

const QUALITY_TAGS = 'no text, best quality, very aesthetic, absurdres'

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
    [key: string]: any
  }
}

export const handleNovelImage: ImageAdapter = async ({ user, prompt, negative }, log, guestId) => {
  const base = user.images
  const settings = user.images?.novel || defaultSettings

  const ucPreset = +(settings.ucPreset || defaultSettings.ucPreset)
  const ucNegative = UC_PRESETS[ucPreset] || ''

  const key = guestId ? user.novelApiKey : decryptText(user.novelApiKey)
  let input = [formatImagePrompt(prompt)]

  if (settings.qualityTags ?? true) {
    input.push(QUALITY_TAGS)
  }

  const finalPrompt = joinImagePrompts(input)
  const finalNegative = joinImagePrompts([negative, ucNegative])

  const payload: NovelImageRequest = {
    action: 'generate',
    input: finalPrompt,
    model: settings.model ?? NOVEL_IMAGE_MODEL.Anime_v4_Curated,
    parameters: {
      autoSmea: false,
      add_original_image: false,
      height: base?.height ?? 384,
      width: base?.width ?? 384,
      characterPrompts: [],
      dynamic_thresholding: false,
      noise_schedule: 'karras',
      controlnet_strength: 1,
      cfg_rescale: 0,
      uc: '',
      n_samples: 1,
      negative_prompt: finalNegative,
      params_version: 3,
      sampler: settings.sampler ?? NOVEL_SAMPLER['DPM++ 2M'],
      scale: base?.cfg ?? 9,
      seed: Math.trunc(Math.random() * 1_000_000_000),
      steps: base?.steps ?? 28,
      // Unsure what to do with these two values
      ucPreset,
      legacy: false,
      legacy_uc: false,
      legacy_v3_extend: false,
      qualityToggle: true,

      v4_negative_prompt: {
        legacy_uc: false,
        caption: { base_caption: finalNegative, char_captions: [] },
      },
      v4_prompt: {
        caption: { base_caption: finalPrompt, char_captions: [] },
        use_coords: false,
        use_order: true,
      },
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
