export type ImageSettings = NovelSettings | HordeSettings | SDSettings

export type NovelSettings = {
  type: 'novel'
  model: string
  sampler: string
  steps?: number
  template: string
  height?: number
  width?: number
}

export type HordeSettings = {
  type: 'horde'
}

export type SDSettings = {
  type: 'sd'
}
