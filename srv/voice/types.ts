import { Validator } from 'frisker'
import { AppSchema } from '../db/schema'
import { VoiceSettings, TTSService } from '../db/texttospeech-schema'
import { AppLog } from '../logger'

export type TextToSpeechHandler = {
  valid: Validator
  getVoices: (
    user: AppSchema.User,
    guestId: string | undefined
  ) => Promise<AppSchema.VoiceDefinition[]>
  generateVoice: TextToSpeechAdapter
}

export type TextToSpeechRequest = {
  user: AppSchema.User
  text: string
  chatId: string
  messageId?: string
  voice: VoiceSettings
  culture: string
}

export type TextToSpeechAdapter = (
  opts: {
    user: AppSchema.User
    text: string
    voice: VoiceSettings
  },
  log: AppLog,
  guestId?: string
) => Promise<TextToSpeechAdapterResponse>

export type TextToSpeechAdapterResponse = { ext: string; content: Buffer }

export type VoicesListRequest = {
  user: AppSchema.User
  ttsService: TTSService
}

export type VoiceListResponse = { voices: AppSchema.VoiceDefinition[] }
