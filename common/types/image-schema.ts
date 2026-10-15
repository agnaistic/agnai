export type ImageType = NovelSettings | HordeSettings | SDSettings | AgnaiSettings | SwarmSettings

export type BaseImageSettings = {
  sampler: string
  scheduler: string

  steps: number
  cfg: number
  seed: number
  prefix: string
  suffix: string

  negative: string
  width: number
  height: number
  clipSkip?: number

  autofix?: boolean

  summaryPresetId?: string
  summariseChat?: boolean
  summaryPrompt?: string
  // template?: string
}

export type ImagePresetSettings = BaseImageSettings & {
  _id: string
  name: string
  imageProviderId: string

  summaryPresetId?: string
  summariseChat?: boolean
  summaryPrompt: string
}

export type ImageDefaults = {
  size: boolean
  affixes: boolean
  negative: boolean
  sampler: boolean
  guidance: boolean
  steps: boolean
}

export type ImageProviderType = 'novel' | 'horde' | 'sd' | 'agnai' | 'swarm' | 'openai'

export type ImageProviderLora = {
  id: string
  clipStrength: number
  modelStrength: number
  enabled: boolean
}

export type ImageProviderSettings = {
  _id: string
  name: string
  type: ImageProviderType
  url: string
  sampler: string
  scheduler?: string
  model: string

  // Inherit auth from Text Provider
  providerId?: string

  // Agnai
  draftMode?: boolean

  // SwarmUI
  local?: boolean
  loras?: Array<ImageProviderLora>

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
