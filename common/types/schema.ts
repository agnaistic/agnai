import type { AIAdapter, ChatAdapter, PersonaFormat, RegisteredAdapter } from '../adapters'
import type { GenerationPreset } from '../presets'
import type { ImageSettings } from '../../srv/db/image-schema'
import type { TTSSettings, VoiceSettings } from './texttospeech-schema'
import { UISettings } from './ui'
import { FullSprite } from './sprite'

export type AllDoc =
  | AppSchema.Chat
  | AppSchema.ChatMessage
  | AppSchema.Character
  | AppSchema.User
  | AppSchema.Profile
  | AppSchema.ChatLock
  | AppSchema.ChatMember
  | AppSchema.ChatInvite
  | AppSchema.UserGenPreset
  | AppSchema.MemoryBook
  | AppSchema.ScenarioBook

export namespace AppSchema {
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
    flags?: string
    slots: {
      enabled: boolean
      menu: string
      menuLg: string
      banner: string
      mobile: string
    }
  }

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
    persona?: Persona
  }

  export interface User {
    _id: string

    updatedAt?: string

    kind: 'user'
    username: string
    hash: string

    admin: boolean

    novelApiKey: string
    novelModel: string
    novelVerified?: boolean

    koboldUrl: string
    thirdPartyFormat: 'kobold' | 'openai' | 'claude'
    thirdPartyPassword: string
    thirdPartyPasswordSet?: boolean
    luminaiUrl: string
    oobaUrl: string

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

    defaultAdapter: AIAdapter
    defaultPresets?: { [key in AIAdapter]?: string }
    defaultPreset?: string

    createdAt?: string

    speechtotext?: {
      enabled: boolean
      autoSubmit: boolean
      autoRecord: boolean
    }

    texttospeech?: TTSSettings

    images?: ImageSettings
    adapterConfig?: { [key in AIAdapter]?: Record<string, any> }

    ui?: UISettings
  }

  export interface Chat {
    _id: string
    kind: 'chat'
    mode?: 'standard' | 'adventure'
    userId: string
    memoryId?: string

    memberIds: string[]
    characters?: Record<string, boolean>

    name: string
    characterId: string
    messageCount: number
    adapter?: ChatAdapter

    greeting?: string
    scenario?: string
    sampleChat?: string
    overrides?: Persona

    createdAt: string
    updatedAt: string

    genPreset?: GenerationPreset | string
    genSettings?: Omit<GenSettings, 'name'>

    scenarioIds?: string[]
    scenarioStates?: string[]
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
    characterId?: string
    userId?: string

    // Only chat owners can rate messages for now
    rating?: 'y' | 'n' | 'none'
    adapter?: string
    imagePrompt?: string
    actions?: ChatAction[]

    createdAt: string
    updatedAt: string
    first?: boolean
    ooc?: boolean
    system?: boolean
    meta?: any
    event?: EventTypes | undefined
  }

  export type EventTypes = 'world' | 'character' | 'hidden' | 'ooc'

  /** Description of the character or user */
  export type Persona =
    | {
        kind: PersonaFormat
        attributes: { [key: string]: string[] }
      }
    | { kind: 'text'; attributes: { text: [string] } }

  export interface Character {
    _id: string
    kind: 'character'
    userId: string

    name: string
    description?: string
    appearance?: string
    culture?: string
    tags?: string[]
    persona: Persona
    greeting: string
    scenario: string
    sampleChat: string

    visualType?: string
    avatar?: string
    sprite?: FullSprite

    createdAt: string
    updatedAt: string

    favorite?: boolean

    voice?: VoiceSettings

    // v2 stuff
    alternateGreetings?: string[]
    characterBook?: MemoryBook
    extensions?: Record<string, any>
    systemPrompt?: string
    postHistoryInstructions?: string
    creator?: string
    characterVersion?: string
  }

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

  export interface UserGenPreset extends GenSettings {
    _id: string
    kind: 'gen-setting'
    userId: string
  }

  export interface GenSettings {
    name: string
    service?: AIAdapter

    useTemplateParser?: boolean

    temp: number
    maxTokens: number
    maxContextLength?: number
    repetitionPenalty: number
    repetitionPenaltyRange: number
    repetitionPenaltySlope: number
    typicalP: number
    topP: number
    topK: number
    topA: number
    tailFreeSampling: number
    encoderRepitionPenalty?: number
    penaltyAlpha?: number
    addBosToken?: boolean
    banEosToken?: boolean
    order?: number[]
    skipSpecialTokens?: boolean

    systemPrompt?: string
    ignoreCharacterSystemPrompt?: boolean
    gaslight?: string
    useGaslight?: boolean
    ultimeJailbreak?: string
    ignoreCharacterUjb?: boolean
    antiBond?: boolean

    frequencyPenalty?: number
    presencePenalty?: number
    oaiModel?: string
    novelModel?: string
    claudeModel?: string
    replicateModelType?: string
    replicateModelVersion?: string
    streamResponse?: boolean

    memoryDepth?: number
    memoryContextLimit?: number
    memoryReverseWeight?: boolean
    src?: string

    images?: {
      adapter: string
    }
  }

  export interface MemoryBook {
    kind: 'memory'
    _id: string
    name: string
    description?: string
    userId: string
    entries: MemoryEntry[]

    // currently unsupported V2 fields which are here so that we don't destroy them
    scanDepth?: number
    tokenBudget?: number
    recursiveScanning?: boolean
    extensions?: Record<string, any>
  }

  export interface MemoryEntry {
    name: string

    /** The text injected into the prompt */
    entry: string

    /** Keywords that trigger the entry to be injected */
    keywords: string[]

    /** When choosing which memories to discard, lowest priority will be discarded first */
    priority: number

    /** When determining what order to render the memories, the highest will be at the bottom  */
    weight: number

    enabled: boolean

    // currently unsupported V2 fields which are here so that we don't destroy them
    id?: number
    comment?: string
    selective?: boolean
    secondaryKeys?: Array<string>
    constant?: boolean
    position?: 'before_char' | 'after_char'
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
  }

  export interface ScenarioEvent {
    /** The state this  */
    name: string
    requires: string[]
    assigns: string[]
    type: EventTypes
    text: string
    trigger: ScenarioEventTrigger
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
}

export type Doc<T extends AllDoc['kind'] = AllDoc['kind']> = Extract<AllDoc, { kind: T }>

export const defaultGenPresets: AppSchema.GenSettings[] = []

export type NewBook = Omit<AppSchema.MemoryBook, 'userId' | '_id' | 'kind'>

export type NewScenario = Omit<AppSchema.ScenarioBook, 'userId' | '_id' | 'kind'>
