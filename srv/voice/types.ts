import { AppSchema } from '../db/schema'
import { AppLog } from '../logger'

export type TextToSpeechRequest = {
  user: AppSchema.User
  text: string
  chatId: string
  messageId?: string
  voiceBackend: AppSchema.VoiceBackend
  voiceId: string
}

export type TextToSpeechAdapter = (
  opts: {
    user: AppSchema.User
    text: string
    voiceBackend: AppSchema.VoiceBackend
    voiceId: string
  },
  log: AppLog,
  guestId?: string
) => Promise<TextToSpeechAdapterResponse>

export type TextToSpeechAdapterResponse = { ext: string; content: Buffer }

export type VoicesListRequest = {
  user: AppSchema.User
  voiceBackend: AppSchema.VoiceBackend
}

export type VoiceListResponse = { voices: AppSchema.VoiceDefinition[] }
