import { AppSchema } from '../srv/db/schema'

type MemoryOpts = {
  chat: AppSchema.Chat
  settings?: AppSchema.UserGenPreset
  book: AppSchema.MemoryBook
}

export function getMemoryPrompt({ chat, book, settings }: MemoryOpts) {
  // const depth = chat.genSettings?.d
}
