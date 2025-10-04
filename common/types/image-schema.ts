export type ImageType =
  | NovelSettings
  | HordeSettings
  | SDSettings
  | AgnaiSettings
  | ImageProvider
  | SwarmSettings

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
  novel: ImageProviderSettings
  horde: ImageProviderSettings
  sd: ImageProviderSettings
  agnai: ImageProviderSettings
  swarm: ImageProviderSettings

  active?: 'novel' | 'horde' | 'sd' | 'agnai' | 'swarm'
  // defaults?: ImageDefaults
}

export type ImageProviderSettings = {
  _id?: string
  type: ImageType['type']
  url: string
  sampler: string
  model: string

  // Inherit auth from Text Provider
  providerId?: string

  // Agnai
  draftMode?: boolean

  // SwarmUI
  local?: boolean
  loras?: Array<{ id: string; clipStrength: number; modelStrength: number; enabled: boolean }>

  // NovelAI
  ucPreset?: string
  qualityTags?: boolean
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

export type SwarmSettings = {
  type: 'swarm'
  sampler: string
  url: string
  model?: string
  local?: boolean
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

export type ImageProvider = {
  type: 'provider'
  name: string
  url: string
  backend: 'sd' | 'swarm' | 'novel' | 'agnai'
  local: boolean

  model: string
  sampler: string

  // Novel
  qualityTags: boolean
  ucPreset: string
}
