import type { AIAdapter, ChatAdapter, ThirdPartyFormat } from '../adapters'
import * as Memory from './memory'
import type { GenerationPreset } from '../presets'
import type { ImageSettings } from './image-schema'
import type { TTSSettings } from './texttospeech-schema'
import type { UISettings } from './ui'
import * as Saga from './saga'
import * as Library from './library'
import * as Preset from './presets'
import * as Admin from './admin'

export type AllDoc =
  | AppSchema.Announcement
  | AppSchema.Chat
  | AppSchema.ChatMessage
  | AppSchema.Character
  | AppSchema.User
  | AppSchema.Profile
  | AppSchema.ChatLock
  | AppSchema.ChatMember
  | AppSchema.ChatInvite
  | AppSchema.UserGenPreset
  | AppSchema.SubscriptionModel
  | AppSchema.SubscriptionTier
  | AppSchema.MemoryBook
  | AppSchema.ScenarioBook
  | AppSchema.ApiKey
  | AppSchema.PromptTemplate
  | AppSchema.Configuration
  | AppSchema.SagaTemplate
  | AppSchema.SagaSession

export type OAuthScope = keyof typeof oauthScopes

export const oauthScopes = ['characters', 'chats', 'presets', 'profile'] as const

export namespace AppSchema {
  export type MemoryBook = Memory.MemoryBook
  export type MemoryEntry = Memory.MemoryEntry

  export type Persona = Library.Persona
  export type BaseCharacter = Library.BaseCharacter
  export type Character = Library.Character

  export type GenSettings = Preset.GenSettings
  export type UserGenPreset = Preset.UserGenPreset
  export type PromptTemplate = Preset.PromptTemplate

  export type SubscriptionTier = Preset.SubscriptionTier
  export type SubscriptionModel = Preset.SubscriptionModel
  export type SubscriptionModelOption = Preset.SubscriptionModelOption
  export type SubscriptionModelLevel = Preset.SubscriptionModelLevel
  export type SubscriptionType = 'native' | 'patreon' | 'manual'

  export type Announcement = Admin.Announcement
  export type ActionCall = Admin.ActionCall
  export type AppConfig = Admin.AppConfig
  export type Configuration = Admin.Configuration
  export type ImageModel = Admin.ImageModel

  export type ChatMode = 'standard' | 'adventure'

  export interface Token {
    userId: string
    username: string
    admin: boolean
    iat: number
    exp: number
  }

  export interface Profile {
    _id: string
    kind: 'profile'
    userId: string
    handle: string
    avatar?: string
  }

  export interface User {
    _id: string

    updatedAt?: string

    /** Date ISO string of last seen announcement */
    announcement?: string

    kind: 'user'
    username: string
    hash: string
    apiKey?: string

    admin: boolean
    role?: 'moderator' | 'admin'

    disableLTM?: boolean

    novelApiKey: string
    novelModel: string
    novelVerified?: boolean
    useLocalPipeline: boolean

    koboldUrl: string
    thirdPartyFormat: ThirdPartyFormat
    thirdPartyPassword: string
    thirdPartyPasswordSet?: boolean
    oobaUrl: string

    mistralKey?: string
    mistralKeySet?: boolean

    oaiKey: string
    oaiKeySet?: boolean

    hordeKey: string
    hordeModel: string | string[]
    hordeName?: string
    hordeUseTrusted?: boolean
    hordeWorkers?: string[]

    scaleUrl?: string
    scaleApiKey?: string
    scaleApiKeySet?: boolean

    claudeApiKey?: string
    claudeApiKeySet?: boolean

    elevenLabsApiKey?: string
    elevenLabsApiKeySet?: boolean

    featherlessApiKey?: string
    featherlessApiKeySet?: boolean

    arliApiKey?: string
    arliApiKeySet?: boolean

    defaultAdapter: AIAdapter
    defaultPresets?: { [key in AIAdapter]?: string }
    defaultPreset?: string
    chargenPreset?: string

    createdAt?: string

    speechtotext?: {
      enabled: boolean
      autoSubmit: boolean
      autoRecord: boolean
    }

    texttospeech?: TTSSettings

    images?: ImageSettings & {}

    imageDefaults?: {
      size: boolean
      affixes: boolean
      negative: boolean
      sampler: boolean
      guidance: boolean
      steps: boolean
    }
    useRecommendedImages?: string // 'all' | 'except-(size|affix|negative)' | 'none'

    adapterConfig?: { [key in AIAdapter]?: Record<string, any> }

    ui?: UISettings

    sub?: {
      type?: SubscriptionType
      tierId: string
      level: number
      last?: string
    }

    manualSub?: {
      tierId: string
      level: number
      expiresAt: string
    }

    patreonUserId?: string | null
    patreon?: {
      access_token: string
      refresh_token: string
      expires_in: number
      scope: string
      token_type: string
      expires: string
      user: Patreon.User
      tier?: Patreon.Tier
      member?: Patreon.Member
      sub?: {
        tierId: string
        level: number
      }
    }

    google?: {
      sub: any
      email: any
    }

    billing?: {
      status: 'active' | 'cancelled'
      cancelling?: boolean
      validUntil: string
      lastRenewed: string
      customerId: string
      subscriptionId: string
      lastChecked?: string
    }
    stripeSessions?: string[]
  }

  export interface ApiKey {
    _id: string
    kind: 'apikey'

    apikey: string
    code: string

    scopes: OAuthScope[]
    challenge?: string
    origin: string
    userId: string
    createdAt: string
    enabled: boolean
  }

  export interface SagaField {
    name: string
    label: string
    visible: boolean
    type: 'string' | 'number' | 'boolean'
  }

  export interface SagaTemplate extends Saga.Template {
    kind: 'saga-template'
  }

  export interface SagaSession extends Saga.Session {
    kind: 'saga-session'
  }

  export interface Chat {
    _id: string
    kind: 'chat'
    mode?: 'standard' | 'adventure' | 'companion'
    userId: string
    memoryId?: string
    userEmbedId?: string

    memberIds: string[]
    characters?: Record<string, boolean>
    tempCharacters?: Record<string, AppSchema.Character>

    name: string
    characterId: string
    messageCount: number
    adapter?: ChatAdapter

    greeting?: string
    scenario?: string
    sampleChat?: string
    systemPrompt?: string
    postHistoryInstructions?: string
    overrides?: Persona

    createdAt: string
    updatedAt: string

    genPreset?: GenerationPreset | string
    genSettings?: Omit<GenSettings, 'name'>

    scenarioIds?: string[]
    scenarioStates?: string[]

    treeLeafId?: string

    imageSource?: 'last-character' | 'main-character' | 'chat' | 'settings'
    imageSettings?: ImageSettings
  }

  export interface ChatMember {
    _id: string
    kind: 'chat-member'
    chatId: string
    userId: string
    createdAt: string
  }

  export type ChatAction = { emote: string; action: string }

  export interface ChatMessage {
    _id: string
    kind: 'chat-message'
    chatId: string
    msg: string
    retries?: string[]
    extras?: string[]
    characterId?: string
    userId?: string
    name?: string

    adapter?: string
    imagePrompt?: string
    actions?: ChatAction[]

    createdAt: string
    updatedAt: string
    first?: boolean
    ooc?: boolean
    system?: boolean
    meta?: any
    event?: ScenarioEventType | undefined
    state?: string
    values?: Record<string, string | number | boolean>
    parent?: string
    json?: {
      response: string
      history: string
      values: any
    }
  }

  export type ScenarioEventType = 'world' | 'character' | 'hidden' | 'ooc'

  export interface ChatInvite {
    _id: string
    kind: 'chat-invite'
    byUserId: string
    invitedId: string
    chatId: string
    createdAt: string
    characterId: string
    state: 'pending' | 'rejected' | 'accepted'
  }

  export interface ChatLock {
    kind: 'chat-lock'

    /** Chat ID, Unique */
    chatLock: string

    /** Time to live in seconds. Locks older than this are invalid */
    ttl: number

    /** ISO string - We will ignore locks of a particular age */
    obtained: string

    /** We return this top the caller requesting a lock. It is used to ensure the lock is valid during a transaction. */
    lockId: string
  }

  export interface ScenarioBook {
    kind: 'scenario'
    _id: string
    userId: string
    name: string
    description?: string
    text: string
    overwriteCharacterScenario: boolean
    instructions?: string
    entries: ScenarioEvent[]
    states: string[]
  }

  export interface ScenarioEvent<T extends ScenarioEventTrigger = ScenarioEventTrigger> {
    /** The state this  */
    name: string
    requires: string[]
    assigns: string[]
    type: ScenarioEventType
    text: string
    trigger: T
  }

  export type ScenarioEventTrigger =
    | ScenarioOnGreeting
    | ScenarioOnManual
    | ScenarioOnChatOpened
    | ScenarioOnCharacterMessageRx

  export interface ScenarioOnGreeting {
    kind: 'onGreeting'
  }

  export interface ScenarioOnManual {
    kind: 'onManualTrigger'
    probability: number
  }

  export interface ScenarioOnChatOpened {
    kind: 'onChatOpened'
    awayHours: number
  }

  export interface ScenarioOnCharacterMessageRx {
    kind: 'onCharacterMessageReceived'
    minMessagesSinceLastEvent: number
  }

  export type ScenarioTriggerKind = ScenarioEventTrigger['kind']

  export interface VoiceDefinition {
    id: string
    label: string
    previewUrl?: string
  }

  export interface VoiceModelDefinition {
    id: string
    label: string
  }
}

export type Doc<T extends AllDoc['kind'] = AllDoc['kind']> = Extract<AllDoc, { kind: T }>

export const defaultGenPresets: AppSchema.GenSettings[] = []

export type NewBook = Omit<AppSchema.MemoryBook, 'userId' | '_id' | 'kind'>

export type NewScenario = Omit<AppSchema.ScenarioBook, 'userId' | '_id' | 'kind'>

export namespace Patreon {
  export type Include = Tier | Member

  export type Tier = {
    id: string
    type: 'tier'
    attributes: {
      amount_cents: number
      description: string
      title: string
    }
    relationships: {
      campaign: {
        data: {
          id: string
          type: 'campaign'
        }
      }
    }
  }

  export type Member = {
    type: 'member'
    id: string
    attributes: {
      campaign_lifetime_support_cents: number
      campaign_entitled_amount_cents: number
      is_gifted: boolean
      last_charge_date: string
      last_charge_status:
        | 'Paid'
        | 'Declined'
        | 'Deleted'
        | 'Pending'
        | 'Refunded'
        | 'Fraud'
        | 'Other'
        | null
      next_charge_date: string
      patron_status: 'active_patron' | 'declined_patron' | 'former_patron'
      pledge_relationship_start: string
      will_pay_amount_cents: number
    }
    relationships: {
      currently_entitled_tiers: { data: Array<{ type: 'tier'; id: string }> }
    }
  }

  export type User = {
    type: 'user'
    id: string
    attributes: {
      created: string
      email: string
      full_name: string
    }
    relationships: {
      memberships: {
        data: Array<{ id: string; type: 'member' }>
      }
    }
  }

  export type Authorize = {
    access_token: string
    refresh_token: string
    scope: string
    expires_in: number
    token_type: string
    version: string
  }
}
