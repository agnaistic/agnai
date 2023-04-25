import needle from 'needle'
import { TextToSpeechAdapter, VoiceListResponse } from './types'
import { ElevenLabsSettings } from '../db/voice-schema'
import { decryptText } from '../db/util'
import { AppSchema } from '../db/schema'

const baseUrl = 'https://api.elevenlabs.io/v1'

const defaultSettings: ElevenLabsSettings = {
  voiceBackend: 'elevenlabs',
}

type ElevenLabsTextToSpeechRequest = {
  text: string
}

type ElevenLabsVoicesListResponse = {
  voices: { voice_id: string; name: string; preview_url: string }[]
}

export const handleElevenLabsVoicesList = async (
  user: AppSchema.User,
  guestId: string | undefined
): Promise<VoiceListResponse['voices']> => {
  const { key } = getSettings(user, guestId)
  const result = await needle('get', `${baseUrl}/voices`, {
    headers: {
      'xi-api-key': key,
      accept: 'application/json',
    },
  })
  const body = result.body as ElevenLabsVoicesListResponse
  return body.voices.map((voice) => ({
    id: voice.voice_id,
    label: voice.name,
    previewUrl: voice.preview_url,
  }))
}

export const handleElevenLabsTextToSpeech: TextToSpeechAdapter = async (
  { user, text, voiceId },
  log,
  guestId
) => {
  const { settings, key } = getSettings(user, guestId)

  const payload: ElevenLabsTextToSpeechRequest = {
    text,
  }
  const result = await needle('post', `${baseUrl}/text-to-speech/${voiceId}/stream`, payload, {
    json: true,
    headers: {
      'xi-api-key': key,
      accept: 'audio/mpeg',
    },
  })

  if (result.statusCode != 200) {
    throw new Error(
      result.body.message ||
        result.body.details?.message ||
        `Error ${result.statusCode}: ${JSON.stringify(result.body)}`
    )
  }

  if (!Buffer.isBuffer(result.body)) {
    throw new Error(result.body.message || 'Unexpected non-buffer response')
  }

  return {
    content: result.body,
    ext: 'mp3',
  }
}
function getSettings(user: AppSchema.User, guestId: string | undefined) {
  const settings = user.voice?.elevenlabs || defaultSettings
  const key = guestId ? user.elevenLabsApiKey : decryptText(user.elevenLabsApiKey!)
  return { settings, key }
}
