export interface Character {
  id: string

  name: string
  description: string
  avatarId?: string
  visibility: 'public' | 'private' | 'unlisted'

  createdAt: string
  updatedAt: string
}

/** Represents an individual message. */
export interface ChatMsg {
  /** Who sent this message. */
  speaker: Speaker

  /** Contents of the message. */
  utterance: string

  /** When the message was sent. */
  timestamp: Date
}

/** Representation of a speaker for front-end components. */
export interface Speaker {
  /** User-friendly name. */
  name: string

  /** URL to the speaker's avatar. */
  avatarUrl?: string

  /** Whether this is a human speaker. */
  isHuman?: boolean
}

export interface User {
  id: string
  email: string
  displayName: string
}
