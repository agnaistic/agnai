export type VoiceSettings = {
  filterActions: boolean

  elevenlabs: Omit<ElevenLabsSettings, 'type'>
}

export type ElevenLabsSettings = {
  voiceBackend: 'elevenlabs'
}
