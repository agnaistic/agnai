type ImageType = NovelSettings | HordeSettings | SDSettings | AgnaiSettings

export type BaseImageSettings = {
  presetId?: string
  type: ImageType['type']

  summaryPresetId?: string
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

export type ImageDefaults = {
  size: boolean
  affixes: boolean
  negative: boolean
  sampler: boolean
  guidance: boolean
  steps: boolean
}

export type ImageSettings = BaseImageSettings & {
  novel: Omit<NovelSettings, 'type'>
  horde: Omit<HordeSettings, 'type'>
  sd: Omit<SDSettings, 'type'>
  agnai: Omit<AgnaiSettings, 'type'>

  // defaults?: ImageDefaults
}

export type NovelSettings = {
  type: 'novel'
  model: string
  sampler: string
  ucPreset: string
  qualityTags: boolean
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
  model?: string

  providerId?: string
}

export type AgnaiSettings = {
  type: 'agnai'
  model: string
  sampler: string
  draftMode: boolean
  loras?: Array<{ id: string; clipStrength: number; modelStrength: number; enabled: boolean }>
}
