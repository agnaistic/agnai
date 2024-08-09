import type {
  AIAdapter,
  HordeModel,
  HordeWorker,
  OpenRouterModel,
  RegisteredAdapter,
} from '../adapters'
import { JsonField } from '../prompt'
import { SubscriptionModelOption, SubscriptionTier } from './presets'
import { ThemeColor } from './ui'

export type UserType = 'guests' | 'users' | 'subscribers' | 'moderators' | 'admins'
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
  name: string
  desc: string
  init: { clipSkip?: number; steps: number; cfg: number; height: number; width: number }
  limit: { clipSkip?: number; steps: number; cfg: number; height: number; width: number }
}

export interface Announcement {
  kind: 'announcement'
  _id: string

  title: string
  content: string

  location?: 'notification' | 'home'

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

  /** Markdown */
  maintenanceMessage: string

  /** Not yet implemented */
  policiesEnabled: boolean

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

  modPresetId: string
  modPrompt: string
  modFieldPrompt: string
  modSchema: JsonField[]

  charlibPublish: 'off' | 'users' | 'subscribers' | 'moderators' | 'admins'
  charlibGuidelines: string
}

export interface ActionCall {
  _id: string
  kind: 'action-call'

  position: 'float-bottom' | 'float-top' | 'fixed-top' | 'fixed-bottom'
  page: 'all' | 'home' | 'top'
  dismissable: boolean

  targets: Record<UserType, boolean>

  title: string
  content: string
  theme: ThemeColor

  createdAt: string
}
