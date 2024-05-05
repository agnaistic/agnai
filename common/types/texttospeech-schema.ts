export type TTSService = 'webspeechsynthesis' | 'elevenlabs' | 'novel' | 'agnai'

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
  | AgnaiTtsSettings

export type VoiceDisabledSettings = {
  service: undefined
  rate?: number
}

export type VoiceElevenLabsSettings = {
  service: 'elevenlabs'
  voiceId: string
  model?: ElevenLabsModel
  stability?: number
  similarityBoost?: number
  rate?: number
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
  rate?: number
}

export type AgnaiTtsSettings = {
  service: 'agnai'
  seed: number
  rate?: number
}

export type SpecificVoiceSetting<T extends VoiceSettings['service']> = Extract<
  VoiceSettings,
  { service: T }
>

export type VoiceSettingForm<T extends VoiceSettings['service']> = Omit<
  SpecificVoiceSetting<T>,
  'service' | 'voiceId'
>
