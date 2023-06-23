import needle from 'needle'
import { TextToSpeechAdapter, VoiceListResponse } from './types'
import { decryptText } from '../db/util'
import { AppSchema } from '../../common/types/schema'
import { errors } from '../api/wrap'
import { Validator } from '/common/valid'
import { ElevenLabsModel } from '../../common/types/texttospeech-schema'

const baseUrl = 'https://api.elevenlabs.io/v1'

const validator: Validator = {
  service: 'string',
  voiceId: 'string',
  model: 'string',
  stability: 'number',
  similarityBoost: 'number',
}

type ElevenLabsTextToSpeechRequest = {
  text: string
  model_id: ElevenLabsModel
  voice_settings: {
    stability: number
    similarity_boost: number
  }
}

type ElevenLabsVoicesListResponse = {
  voices: { voice_id: string; name: string; preview_url: string }[]
}

const handleElevenLabsVoicesList = async (
  user: AppSchema.User,
  guestId: string | undefined
): Promise<VoiceListResponse['voices']> => {
  const key = getKey(user, guestId)
  const result = await needle('get', `${baseUrl}/voices`, {
    headers: {
      'xi-api-key': key,
      accept: 'application/json',
    },
  })
  if (result.statusCode !== 200) {
    throw new Error(
      result.body.message ||
        result.body.details?.message ||
        `Error ${result.statusCode}: ${JSON.stringify(result.body)}`
    )
  }
  const body = result.body as ElevenLabsVoicesListResponse
  return (
    body.voices?.map((voice) => ({
      id: voice.voice_id,
      label: voice.name,
      previewUrl: voice.preview_url,
    })) ?? []
  )
}

const handleElevenLabsTextToSpeech: TextToSpeechAdapter = async (
  { user, text, voice },
  log,
  guestId
) => {
  const key = getKey(user, guestId)
  if (voice.service !== 'elevenlabs') throw new Error('Invalid service')
  const payload: ElevenLabsTextToSpeechRequest = {
    text,
    model_id: voice.model || 'eleven_multilingual_v1',
    voice_settings: {
      stability: voice.stability || 0.75,
      similarity_boost: voice.similarityBoost || 0.75,
    },
  }
  const result = await needle(
    'post',
    `${baseUrl}/text-to-speech/${voice.voiceId}/stream`,
    payload,
    {
      json: true,
      headers: {
        'xi-api-key': key,
        accept: 'audio/mpeg',
      },
    }
  )

  if (result.statusCode !== 200) {
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

function getKey(user: AppSchema.User, guestId: string | undefined) {
  let key: string | undefined
  if (guestId) key = user.elevenLabsApiKey
  else if (user.elevenLabsApiKey) key = decryptText(user.elevenLabsApiKey!)
  if (!key) throw errors.Forbidden
  return key
}

export const elevenlabsHandler = {
  validator,
  getVoices: handleElevenLabsVoicesList,
  generateVoice: handleElevenLabsTextToSpeech,
}
