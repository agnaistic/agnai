type ImageType = NovelSettings | HordeSettings | SDSettings | AgnaiSettings

export type BaseImageSettings = {
  type: ImageType['type']

  summaryPrompt?: string
  summariseChat?: boolean

  prefix?: string
  suffix?: string
  negative?: string

  template?: string
  width: number
  height: number
  steps: number
  cfg: number
}

export type ImageSettings = BaseImageSettings & {
  novel: Omit<NovelSettings, 'type'>
  horde: Omit<HordeSettings, 'type'>
  sd: Omit<SDSettings, 'type'>
  agnai: Omit<AgnaiSettings, 'type'>
}

export type NovelSettings = {
  type: 'novel'
  model: string
  sampler: string
}

export type HordeSettings = {
  type: 'horde'
  sampler: string
  model: string
}

export type SDSettings = {
  type: 'sd'
  sampler: string
  url: string
}

export type AgnaiSettings = {
  type: 'agnai'
  model: string
}

export const baseImageValid = {
  imageType: ['horde', 'sd', 'agnai', 'novel'],
  imageSteps: 'number',
  imageWidth: 'number',
  imageHeight: 'number',
  imageCfg: 'number',
  imagePrefix: 'string',
  imageSuffix: 'string',
  imageNegative: 'string',
  summaryPrompt: 'string',
  summariseChat: 'boolean',
} as const
