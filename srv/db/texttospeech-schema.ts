export type TTSService = 'webspeechsynthesis' | 'elevenlabs' | 'novel'

export type TTSSettings = {
  enabled: boolean
  filterActions: boolean
}

export type ElevenLabsModel = 'eleven_multilingual_v1' | 'eleven_monolingual_v1'

export type VoiceSettings =
  | VoiceDisabledSettings
  | VoiceElevenLabsSettings
  | VoiceWebSynthesisSettings
  | NovelTtsSettings

export type VoiceDisabledSettings = {
  service: undefined
}

export type VoiceElevenLabsSettings = {
  service: 'elevenlabs'
  voiceId: string
  model?: ElevenLabsModel
  stability?: number
  similarityBoost?: number
}

export type VoiceWebSynthesisSettings = {
  service: 'webspeechsynthesis'
  voiceId: string
  pitch?: number
  rate?: number
}

export type NovelTtsSettings = {
  service: 'novel'
  voiceId: string
  seed?: string
}

export type SpecificVoiceSetting<T extends VoiceSettings['service']> = Extract<
  VoiceSettings,
  { service: T }
>

export type VoiceSettingForm<T extends VoiceSettings['service']> = Omit<
  SpecificVoiceSetting<T>,
  'service' | 'voiceId'
>
