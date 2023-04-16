type ImageType = NovelSettings | HordeSettings | SDSettings

export type ImageSettings = {
  type?: ImageType['type']
  template?: string
  width?: number
  height?: number
  steps?: number
  cfg?: number

  novel?: NovelSettings
  hode?: HordeSettings
  sd?: SDSettings
}

export type NovelSettings = {
  type: 'novel'
  model: string
  sampler: string
}

export type HordeSettings = {
  type: 'horde'
  sampler: string
}

export type SDSettings = {
  type: 'sd'
  sampler: string
  url: string
}
