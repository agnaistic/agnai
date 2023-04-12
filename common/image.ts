export const IMAGE_ADAPTERS = ['novel', 'horde', 'sd'] as const

export type ImageAdapter = (typeof IMAGE_ADAPTERS)[number]

export const NOVEL_IMAGE_MODELS = {
  Full: 'nai-diffusion',
  Safe: 'safe-diffusion',
  Furry: 'nai-diffusion-furry',
}
