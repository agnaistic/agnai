import { AppSchema } from '../db/schema'
import { AppLog } from '../logger'

export type TextToSpeechRequest = {
  user: AppSchema.User
  text: string
  chatId: string
  messageId?: string
  ephemeral?: boolean
}

export type TextToSpeechAdapter = (
  opts: {
    user: AppSchema.User
    text: string
  },
  log: AppLog,
  guestId?: string
) => Promise<TextToSpeechAdapterResponse>

export type TextToSpeechAdapterResponse = { ext: string; content: Buffer }
