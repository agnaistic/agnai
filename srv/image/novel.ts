import Zip from 'adm-zip'
import needle from 'needle'
import { ImageAdapter } from './types'
import { NOVEL_IMAGE_MODEL, NOVEL_SAMPLER, NOVEL_SAMPLER_REV } from '../../common/image'
import { NovelSettings } from '../../common/types/image-schema'
import { formatImagePrompt, joinImagePrompts } from '/common/util'
import { AppSchema } from '/common/types'
import { decryptText } from '../db/util'

const baseUrl = `https://image.novelai.net/ai`

const defaultSettings: NovelSettings = {
  type: 'novel',
  model: NOVEL_IMAGE_MODEL.Anime_v5_Full,
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

export const handleNovelImage: ImageAdapter = async (
  { user, prompt, negative, settings, provider },
  log,
  guestId
) => {
  const ucPreset = +(provider.ucPreset || defaultSettings.ucPreset)
  const ucNegative = UC_PRESETS[ucPreset] || ''

  const key = getNovelApiKey(user, !!guestId)

  let input = [formatImagePrompt(prompt)]

  if (provider.qualityTags ?? true) {
    input.push(QUALITY_TAGS)
  }

  const finalPrompt = joinImagePrompts(input)
  const finalNegative = joinImagePrompts([negative, ucNegative])

  const payload = {
    action: 'generate',
    input: finalPrompt,
    model: provider.model ?? NOVEL_IMAGE_MODEL.Anime_v5_Full,
    parameters: {
      params_version: 4,
      autoSmea: false,
      add_original_image: false,
      height: settings?.height ?? 1024,
      width: settings?.width ?? 1024,
      characterPrompts: [],
      dynamic_thresholding: false,
      noise_schedule: 'karras',
      controlnet_strength: 1,
      cfg_rescale: 0,
      uc: '',
      n_samples: 1,
      negative_prompt: finalNegative,
      sampler: provider.sampler ?? NOVEL_SAMPLER['Euler Ancestral'],
      scale: settings?.cfg ?? 9,
      seed: Math.trunc(Math.random() * 1_000_000_000),
      steps: settings?.steps ?? 28,
      // Unsure what to do with these two values
      ucPresetId:
        ucPreset === 0
          ? 'heavy'
          : ucPreset === 1
          ? 'light'
          : ucPreset === 3
          ? 'humanFocus'
          : ucPreset === 4
          ? 'furryFocus'
          : 'none',
      legacy: false,
      legacy_uc: false,
      legacy_v3_extend: false,
      qualityToggle: true,
      straight_alpha: true,
      tag_hint_qt: 1,
      tag_hint_uc_preset: 4,

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

  if (payload.parameters.sampler in NOVEL_SAMPLER_REV === false) {
    payload.parameters.sampler = NOVEL_SAMPLER['Euler Ancestral']
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

  if (result.body.images?.length) {
    const base64 = result.body.images[0].image
    const buffer = Buffer.from(base64, 'base64')
    return { ext: 'png', content: buffer }
  }

  const zip = new Zip(result.body).getEntries()
  const entry = zip.find((entry) => entry.entryName.endsWith('.png'))

  if (!entry) {
    throw new Error(`Failed to generate image: Novel response did not contain an image`)
  }

  return { ext: 'png', content: entry.getData() }
}

// Specifically for Image/TTS gen, there is no preset with the API key set
// This can be removed after Image Presets w/ Providers
export function getNovelApiKey(user: AppSchema.User, isGuest: boolean) {
  const provider = user.providers?.find((p) => p.provider === `known-novel`)
  if (provider && provider.key) {
    const key = isGuest ? provider.key : decryptText(provider.key)
    return key
  }

  if (user.novelApiKey) {
    const key = isGuest ? user.novelApiKey : decryptText(user.novelApiKey)
    return key
  }

  return ''
}
