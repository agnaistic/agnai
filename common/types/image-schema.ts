type ImageType = NovelSettings | HordeSettings | SDSettings

export type ImageSettings = {
  type: ImageType['type']

  summaryPrompt?: string
  summariseChat?: boolean

  template?: string
  width: number
  height: number
  steps: number
  cfg: number

  novel: Omit<NovelSettings, 'type'>
  horde: Omit<HordeSettings, 'type'>
  sd: Omit<SDSettings, 'type'>
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
