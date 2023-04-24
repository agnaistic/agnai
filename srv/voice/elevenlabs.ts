import needle from 'needle'
import { TextToSpeechAdapter } from './types'
import { ElevenLabsSettings } from '../db/voice-schema'
import { decryptText } from '../db/util'

const baseUrl = 'https://api.elevenlabs.io/v1'

const defaultSettings: ElevenLabsSettings = {
  type: 'elevenlabs',
  voiceId: '',
}

type ElevenLabsTextToSpeechRequest = {
  text: string
}

export const handleElevenLabsTextToSpeech: TextToSpeechAdapter = async (
  { user, text },
  guestId
) => {
  const settings = user.voice?.elevenlabs || defaultSettings
  const key = guestId ? user.elevenLabsApiKey : decryptText(user.elevenLabsApiKey!)

  const payload: ElevenLabsTextToSpeechRequest = {
    text,
  }
  const result = await needle(
    'post',
    `${baseUrl}/text-to-speech/${settings.voiceId}/stream`,
    payload,
    {
      json: true,
      headers: {
        'x-api-key': key,
        accept: 'audio/mpeg',
      },
    }
  )

  if (result.statusCode != 200) {
    throw new Error(result.body.message || `Error ${result.statusCode}`)
  }

  if (!Buffer.isBuffer(result.body)) {
    throw new Error(result.body.message || 'Unexpected non-buffer response')
  }

  return {
    content: result.body,
    ext: 'mp3',
  }
}
