import { Validator } from '/common/valid'
import { AppSchema } from '../../common/types/schema'
import { VoiceSettings, TTSService } from '../../common/types/texttospeech-schema'
import { AppLog } from '../middleware'

export type TextToSpeechHandler = {
  validator: Validator
  getVoices: (
    user: AppSchema.User,
    guestId: string | undefined
  ) => Promise<AppSchema.VoiceDefinition[]>
  getModels: (
    user: AppSchema.User,
    guestId: string | undefined
  ) => Promise<AppSchema.VoiceModelDefinition[]>
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

export type VoiceModelsListRequest = {
  user: AppSchema.User
  ttsService: TTSService
}

export type VoiceModelListResponse = { models: AppSchema.VoiceModelDefinition[] }
