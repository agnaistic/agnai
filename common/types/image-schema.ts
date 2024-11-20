type ImageType = NovelSettings | HordeSettings | SDSettings | AgnaiSettings

export type BaseImageSettings = {
  type: ImageType['type']

  summaryPrompt?: string
  summariseChat?: boolean

  prefix?: string
  suffix?: string
  negative?: string

  template?: string
  clipSkip?: number
  width: number
  height: number
  steps: number
  cfg: number
  seed?: number
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
  sampler: string
  draftMode: boolean
}
