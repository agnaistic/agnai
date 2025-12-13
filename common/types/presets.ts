import { AIAdapter, OpenRouterModel, ThirdPartyFormat } from '../adapters'
import { ModelFormat } from '../presets/templates'
import { ProviderFormat } from '../providers'
import { BaseImageSettings } from './image-schema'
import { ResponseSchema } from './library'

export interface Provider {
  _id: string
  /** 'custom-* | self-* | known-*' */
  provider: string

  /** For providers that have multiple formats (Claude, OpenAI, ...) */
  format?: ProviderFormat

  /** For annoying providers like OpenAI and Mistral that don't version their APIs correctly */
  subFormat?: string

  /** User-provided name */
  name: string
  url: string

  disableAutoUrl: boolean

  key: string
  keySet?: boolean
  userKey?: string
}

export interface SubscriptionTier {
  kind: 'subscription-tier'
  _id: string

  productId: string
  priceId: string
  patreon?: {
    tierId: string
    cost: number
  }
  apiAccess: boolean
  guidanceAccess: boolean
  imagesAccess: boolean

  name: string
  description: string
  cost: number
  level: number
  enabled: boolean
  disableSlots?: boolean
  createdAt: string
  deletedAt?: string
  updatedAt: string
}

export interface SubscriptionModelOption {
  _id: string
  name: string
  level: number
  service: AIAdapter
  guidance: boolean
  preset: GenSettings &
    Pick<
      SubscriptionModel,
      | 'allowGuestUsage'
      | 'isDefaultSub'
      | '_id'
      | 'service'
      | 'levels'
      | 'subLevel'
      | 'subDisabled'
      | 'subVisionModel'
    > & {
      kind: 'submodel'
    }
}

export interface SubscriptionModelLevel {
  level: number
  maxTokens: number
  maxContextLength: number
}

export interface SubscriptionModel extends GenSettings {
  _id: string
  kind: 'subscription-setting'
  subLevel: number
  subModel: string
  subApiKey: string
  subApiKeySet?: boolean
  subServiceUrl?: string
  subVisionModel?: boolean
  subDisabled: boolean
  allowGuestUsage?: boolean
  isDefaultSub?: boolean
  deletedAt?: string
  guidanceCapable?: boolean
  jsonSchemaCapable?: boolean
  levels: SubscriptionModelLevel[]
}

export interface UserGenPreset extends GenSettings {
  _id: string
  kind: 'gen-setting'
  userId: string
}

export type PresetParser =
  | { type: 'replace'; from: string; to: string }
  | { type: 'remove'; text: string }

export type Sampler =
  | 'topK'
  | 'typicalP'
  | 'topP'
  | 'topA'
  | 'repetitionPenalty'
  | 'frequencyPenalty'
  | 'minP'
  | 'tailFreeSampling'
  | 'temperature'

export type SamplerState = 'on' | 'off' | 'auto' | string

export interface GenSettings {
  name: string
  userId?: string
  description?: string
  presetMode?: 'simple' | 'advanced' | undefined

  service?: AIAdapter
  providerId?: string
  tokenizer?: string

  temp: number
  tempLast?: boolean

  dynatemp_range?: number
  dynatemp_exponent?: number

  xtcProbability?: number
  xtcThreshold?: number

  dryMultiplier?: number
  dryBase?: number
  dryAllowedLength?: number
  dryRange?: number
  drySequenceBreakers?: string[]

  smoothingFactor?: number
  smoothingCurve?: number

  maxTokens: number
  maxContextLength?: number
  useMaxContext?: boolean
  repetitionPenalty: number
  repetitionPenaltyRange: number
  repetitionPenaltySlope: number
  typicalP: number
  minP?: number
  topP: number
  topK: number
  topA: number
  mirostatTau?: number
  mirostatLR?: number
  tailFreeSampling: number
  encoderRepitionPenalty?: number
  doSample?: boolean
  penaltyAlpha?: number
  numBeams?: number

  localRequests?: boolean
  userThirdPartyKey?: string

  addBosToken?: boolean
  banEosToken?: boolean
  tokenHealing?: boolean

  skipRoleMerging?: boolean
  postUserRole?: boolean
  disableNameStops?: boolean
  earlyStopping?: boolean
  stopSequences?: string[]
  trimStop?: boolean
  etaCutoff?: number
  epsilonCutoff?: number
  swipesPerGeneration?: number
  mirostatToggle?: boolean

  order?: number[]
  disabledSamplers?: number[]

  skipSpecialTokens?: boolean

  phraseBias?: Array<{ bias: number; seq: string }>
  phraseRepPenalty?: string
  cfgScale?: number
  cfgOppose?: string

  jinjaTemplate?: string
  jinjaEnabled?: boolean
  systemPrompt?: string
  ignoreCharacterSystemPrompt?: boolean
  gaslight?: string
  promptTemplateId?: string
  modelFormat?: ModelFormat
  useAdvancedPrompt?: 'basic' | 'validate' | 'no-validation'
  promptOrderFormat?: string
  promptOrder?: Array<{ placeholder: string; enabled: boolean }>
  ultimeJailbreak?: string
  prefixNameAppend?: boolean
  prefill?: string
  ignoreCharacterUjb?: boolean
  antiBond?: boolean
  reasoning?: {
    start: string
    end: string
    effort: string
    enabled: boolean
    exclude: boolean
    maxTokens: number
  }

  frequencyPenalty?: number
  presencePenalty?: number

  providerModels?: Record<string, string>
  providerSettings?: Record<string, any>

  oaiModel?: string
  novelModel?: string
  claudeModel?: string
  mistralModel?: string
  openRouterModel?: OpenRouterModel
  googleModel?: string
  featherlessModel?: string
  arliModel?: string

  thirdPartyUrl?: string
  thirdPartyFormat?: ThirdPartyFormat
  thirdPartyUrlNoSuffix?: boolean
  thirdPartyModel?: string
  thirdPartyKey?: string

  /** API-controlled property */
  thirdPartyKeySet?: boolean

  replicateModelName?: string
  replicateModelType?: string
  replicateModelVersion?: string

  streamResponse?: boolean

  memoryDepth?: number
  memoryContextLimit?: number
  memoryReverseWeight?: boolean
  memoryChatEmbedLimit?: number
  memoryUserEmbedLimit?: number

  src?: string

  imageSettings?: BaseImageSettings

  json?: ResponseSchema
  jsonEnabled?: boolean | 'off' | 'standard' | 'separate'
  jsonSource?: 'preset' | 'character' | 'json-preset'

  temporary?: Record<string, any>
  registered?: { [key in AIAdapter]?: Record<string, any> }

  updatedAt?: string

  parsers?: PresetParser[]

  samplers?: { [key in Sampler]?: SamplerState }
}

export interface PromptTemplate {
  kind: 'prompt-template'
  _id: string
  name: string
  template: string
  userId: string
  public?: boolean
  createdAt: string
  updatedAt: string
}

export interface ImageSamplers {
  sampler: string
  steps: number
  clipSkip: number
  width: number
  height: number
  cfg: number
  seed?: number

  /** Agnaistic specific */
  draftMode: boolean
  loras?: Array<{ id: string; clipStrength: boolean; modelStrength: number; enabled: boolean }>

  /** NovelAI specific */
  ucPreset: string
  qualityTags: boolean
}
export interface ImagePreset extends ImageSamplers {
  _id: string
  userId: string
  kind: 'image-preset'

  name: string
  description: string

  providerId: string
  providerModels?: Record<string, { id: string }>
}

export type ImageHost = 'agnaistic' | 'novel' | 'sdapi' | 'horde'

export type ImageProvider = {
  type: ImageHost
  name: string

  url: string

  key: string
  userKey?: string //
  keySet?: boolean
}
