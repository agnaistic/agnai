type VoiceType = ElevenLabsSettings

export type VoiceSettings = {
  type?: VoiceType['type']

  filterActions: boolean

  elevenlabs: Omit<ElevenLabsSettings, 'type'>
}

export type ElevenLabsSettings = {
  type: 'elevenlabs'
  voiceId?: string
}
