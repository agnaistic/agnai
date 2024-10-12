import { PersonaFormat } from '../adapters'
import { JsonField } from '../prompt'
import { ImageSettings } from './image-schema'
import { MemoryBook } from './memory'
import { FullSprite } from './sprite'
import { VoiceSettings } from './texttospeech-schema'

/** Description of the character or user */
export type Persona =
  | {
      kind: PersonaFormat
      attributes: { [key: string]: string[] }
    }
  | { kind: 'text'; attributes: { text: [string] } }

export interface BaseCharacter {
  _id: string
  name: string
  description?: string
  appearance?: string
  avatar?: string
  persona: Persona
  greeting: string
  scenario: string
  sampleChat: string
}

export interface Character extends BaseCharacter {
  kind: 'character'
  userId: string

  culture?: string
  tags?: string[]

  visualType?: string
  sprite?: FullSprite

  createdAt: string
  updatedAt: string
  deletedAt?: string

  favorite?: boolean

  voice?: VoiceSettings
  voiceDisabled?: boolean

  json?: ResponseSchema

  folder?: string
  // v2 stuff
  alternateGreetings?: string[]
  characterBook?: MemoryBook
  extensions?: Record<string, any>
  systemPrompt?: string
  postHistoryInstructions?: string
  insert?: { depth: number; prompt: string }
  creator?: string
  characterVersion?: string
  imageSettings?: ImageSettings
}

export interface LibraryCharacter extends Omit<Character, 'kind' | 'tags'> {
  kind: 'library-character'
  tags: string[]

  // Statistics
  downloads: number
  reactions: Record<string, number>
  chats: number
  messages: number
}

export interface ResponseSchema {
  schema: JsonField[]
  response: string
  history: string
}
