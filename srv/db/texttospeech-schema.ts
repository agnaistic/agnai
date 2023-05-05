export type TextToSpeechBackend = 'webspeechsynthesis' | 'elevenlabs'

export type TextToSpeechSettings = {
  filterActions: boolean
}

export type ElevenLabsModels = 'eleven_multilingual_v1' | 'eleven_monolingual_v1'

export type CharacterVoiceSettings =
  | CharacterVoiceDisabledSettings
  | CharacterVoiceElevenLabsSettings
  | CharacterVoiceWebSpeechSynthesisSettings

export type CharacterVoiceDisabledSettings = {
  backend: undefined
}

export type CharacterVoiceElevenLabsSettings = {
  backend: 'elevenlabs'
  voiceId: string
  model?: ElevenLabsModels
  stability?: number
  similarityBoost?: number
}

export type CharacterVoiceWebSpeechSynthesisSettings = {
  backend: 'webspeechsynthesis'
  voiceId: string
  pitch?: number
  rate?: number
}
