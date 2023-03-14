import { AppSchema } from '../srv/db/schema'
import { defaultPresets } from './presets'

type MemoryOpts = {
  chat: AppSchema.Chat
  settings?: AppSchema.UserGenPreset
  book: AppSchema.MemoryBook
  messages: AppSchema.ChatMessage[]
  message: string
}

export function getMemoryPrompt({ chat, book, settings }: MemoryOpts) {
  if (!book.entries) return

  const depth = chat.genSettings?.memoryDepth || defaultPresets.basic.memoryDepth
  if (isNaN(depth) || depth <= 0) return

  const entries: string[] = []

  /**
   * @TODO
   * Validate order of messages
   */
}
