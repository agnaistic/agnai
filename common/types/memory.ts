export type UserEmbed<T = {}> = {
  id: string
  distance: number
  text: string
  date: string
} & T

export type ChatEmbed = { _id: string; msg: string; name: string; createdAt: string }

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
  secondaryKeys?: Array<string>
  constant?: boolean
  position?: 'before_char' | 'after_char'

  // V2 props
  probability?: number
  useProbability?: boolean
  selective?: boolean
  selectiveLogic?: number
  excludeRecursion?: boolean
}
