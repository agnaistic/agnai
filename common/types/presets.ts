import { AIAdapter, OpenRouterModel, ThirdPartyFormat } from '../adapters'
import { ModelFormat } from '../presets/templates'
import { BaseImageSettings, ImageSettings } from './image-schema'
import { ResponseSchema } from './library'

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
      'allowGuestUsage' | 'isDefaultSub' | '_id' | 'service' | 'levels' | 'subLevel' | 'subDisabled'
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
  subDisabled: boolean
  allowGuestUsage?: boolean
  isDefaultSub?: boolean
  deletedAt?: string
  tokenizer?: string
  guidanceCapable?: boolean
  jsonSchemaCapable?: boolean
  levels: SubscriptionModelLevel[]
}

export interface UserGenPreset extends GenSettings {
  _id: string
  kind: 'gen-setting'
  userId: string
}

export interface GenSettings {
  name: string
  description?: string
  presetMode?: 'simple' | 'advanced' | undefined

  service?: AIAdapter

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
  addBosToken?: boolean
  banEosToken?: boolean
  tokenHealing?: boolean

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

  frequencyPenalty?: number
  presencePenalty?: number
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
  jsonEnabled?: boolean
  jsonSource?: 'preset' | 'character'

  useCharacterSchema?: boolean

  temporary?: Record<string, any>
  registered?: { [key in AIAdapter]?: Record<string, any> }

  updatedAt?: string
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

export interface ImagePreset extends ImageSettings {
  kind: 'image-preset'
  _id: string
  userId: string
  name: string
  description: string
}
