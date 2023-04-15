export const IMAGE_ADAPTERS = ['novel', 'horde', 'sd'] as const

export type ImageAdapter = (typeof IMAGE_ADAPTERS)[number]

export type NovelImageModel = (typeof NOVEL_IMAGE_MODEL)[keyof typeof NOVEL_IMAGE_MODEL]

export const NOVEL_IMAGE_MODEL = {
  Full: 'nai-diffusion',
  Safe: 'safe-diffusion',
  Furry: 'nai-diffusion-furry',
} as const

export const NOVEL_SAMPLER = {
  DPMPP_2M: 'k_dpmpp_2m',
  DPMPP_SDE: 'k_dpmpp_sde',
  DPMPP_2S_ANCESTRAL: 'k_dpmpp_2s_ancestral',
  EULER: 'k_euler',
  EULER_ANCESTRAL: 'k_euler_ancestral',
  DPM_FAST: 'k_dpm_fast',
  DDIM: 'ddim',
} as const
