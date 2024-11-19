import type {
  AIAdapter,
  HordeModel,
  HordeWorker,
  OpenRouterModel,
  RegisteredAdapter,
} from '../adapters'
import { SubscriptionModelOption, SubscriptionTier } from './presets'
import { ThemeColor } from './ui'

export type UserType = 'guests' | 'all' | 'users' | 'subscribers' | 'moderators' | 'admins'
export interface AppConfig {
  adapters: AIAdapter[]
  version: string
  canAuth: boolean
  imagesSaved: boolean
  assetPrefix: string
  selfhosting: boolean
  registered: Array<Omit<RegisteredAdapter, 'contextLimit'>>
  maintenance?: string
  patreon?: boolean
  policies?: boolean
  apiAccess?: boolean
  guidanceAccess?: boolean
  flags?: string
  patreonAuth?: {
    clientId: string
  }

  pipelineProxyEnabled: boolean
  authUrls: string[]
  horde: {
    models: HordeModel[]
    workers: HordeWorker[]
  }
  openRouter: { models: OpenRouterModel[] }
  subs: Array<SubscriptionModelOption>

  /** @todo remove after next deployment */
  tier?: SubscriptionTier
  serverConfig?: Configuration
}

export type ImageModel = {
  id: string
  name: string
  desc: string
  override: string
  level: number
  host: string
  lora: boolean
  init: {
    clipSkip?: number
    steps: number
    cfg: number
    height: number
    width: number
    suffix: string
    prefix: string
    negative: string
    sampler: string
    denoise: number
  }
  limit: { clipSkip?: number; steps: number; cfg: number; height: number; width: number }
}

export interface Announcement {
  kind: 'announcement'
  _id: string

  title: string
  content: string

  location?: 'notification' | 'home' | 'cta'

  userType?: UserType
  userLevel?: number

  cta?: ActionCall

  /** Date ISO string */
  showAt: string
  hide: boolean

  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface Configuration {
  kind: 'configuration'

  /** JSON - merges with slots.txt, but this takes precedence when field collisions occur */
  slots: string

  /** Determines who can use API access for inferencing */
  apiAccess: 'off' | 'users' | 'subscribers' | 'admins'

  maintenance: boolean

  supportEmail: string
  stripeCustomerPortal: string

  /** Markdown */
  maintenanceMessage: string

  /** Not yet implemented */
  policiesEnabled: boolean

  lockSeconds: number

  /** Not yet implemented */
  tosUpdated: string
  /** Not yet implemented */
  termsOfService: string

  /** Not yet implemented */
  privacyUpdated: string
  /** Not yet implemented */
  privacyStatement: string

  /** Concatenated to adapters listed in ADAPTERS envvar */
  /** Not yet implemented */
  enabledAdapters: string[]

  imagesEnabled: boolean
  imagesHost: string
  imagesModels: ImageModel[]

  googleClientId: string
  googleEnabled: boolean

  ttsHost: string
  ttsApiKey: string
  ttsAccess: 'off' | 'users' | 'subscribers' | 'admins'

  maxGuidanceTokens: number
  maxGuidanceVariables: number

  actionCalls: ActionCall[]
}

export interface ActionCall {
  position: 'float-bottom' | 'float-top' | 'fixed-top' | 'fixed-bottom' | 'top' | 'bottom'
  page: 'all' | 'home' | 'chat'
  dismissable: boolean

  targets: Record<UserType, boolean>

  title: string
  content: string
  theme: ThemeColor
}
