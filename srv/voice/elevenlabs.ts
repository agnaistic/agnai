import needle from 'needle'
import { TextToSpeechAdapter, VoiceListResponse, VoiceModelListResponse } from './types'
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

type ElevenLabsModelsListResponse = Array<{
  model_id: string
  name: string
  can_do_text_to_speech: boolean
}>

const handleElevenLabsTextToSpeech: TextToSpeechAdapter = async (
  { user, text, voice },
  _log,
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

async function handleElevenLabsVoicesList(
  user: AppSchema.User,
  guestId: string | undefined
): Promise<VoiceListResponse['voices']> {
  const key = getKey(user, guestId)
  const result = await needle('get', `${baseUrl}/voices?show_legacy=true`, {
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

  if (!body.voices) return []

  const voices = body.voices.map((voice) => ({
    id: voice.voice_id,
    label: voice.name,
    previewUrl: voice.preview_url,
  }))

  voices.sort((l, r) => l.label.localeCompare(r.label))

  return voices
}

async function handleElevenLabsModelsList(
  user: AppSchema.User,
  guestId: string | undefined
): Promise<VoiceModelListResponse['models']> {
  const key = getKey(user, guestId)
  const result = await needle('get', `${baseUrl}/models`, {
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
  const body = result.body as ElevenLabsModelsListResponse
  const voiceModels = body.filter((model) => model.can_do_text_to_speech === true)

  return (
    voiceModels?.map((model) => ({
      id: model.model_id,
      label: model.name,
    })) ?? []
  )
}

function getKey(user: AppSchema.User, guestId: string | undefined) {
  if (guestId) {
    return user.elevenLabsApiKey
  }

  if (user.elevenLabsApiKey) {
    return decryptText(user.elevenLabsApiKey!)
  }
  throw errors.Forbidden
}

export const elevenlabsHandler = {
  validator,
  getVoices: handleElevenLabsVoicesList,
  getModels: handleElevenLabsModelsList,
  generateVoice: handleElevenLabsTextToSpeech,
}
