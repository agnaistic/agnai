import { Validator } from 'frisker'
import { AppSchema } from '../db/schema'
import { CharacterVoiceSettings, TextToSpeechBackend } from '../db/texttospeech-schema'
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
  voice: CharacterVoiceSettings
  culture: string
}

export type TextToSpeechAdapter = (
  opts: {
    user: AppSchema.User
    text: string
    voice: CharacterVoiceSettings
  },
  log: AppLog,
  guestId?: string
) => Promise<TextToSpeechAdapterResponse>

export type TextToSpeechAdapterResponse = { ext: string; content: Buffer }

export type VoicesListRequest = {
  user: AppSchema.User
  ttsBackend: TextToSpeechBackend
}

export type VoiceListResponse = { voices: AppSchema.VoiceDefinition[] }
