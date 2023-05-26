import needle from 'needle'
import { TextToSpeechAdapter, VoiceListResponse } from './types'
import { AppSchema } from '../db/schema'
import { errors } from '../api/wrap'
import { Validator } from 'frisker'

const valid: Validator = {
  service: 'string',
  voiceId: 'string',
}

type SileroApiServerTextToSpeechRequest = {
  speaker: string
  text: string
  session?: string
}

type SileroApiServerVoicesListResponse = { voice_id: string; name: string; preview_url: string }[]

const handleSileroApiServerVoicesList = async (
  user: AppSchema.User,
  guestId: string | undefined
): Promise<VoiceListResponse['voices']> => {
  const url = getUrl(user, guestId)
  const result = await needle('get', `${url}/tts/speakers`, {
    headers: {
      accept: 'application/json',
    },
  })
  if (result.statusCode !== 200) {
    throw new Error(
      result.body.detail?.msg || `Error ${result.statusCode}: ${JSON.stringify(result.body)}`
    )
  }
  console.log(JSON.stringify(result.body, null, 2))
  const body = result.body as SileroApiServerVoicesListResponse
  return (
    body.map((voice) => ({
      id: voice.voice_id,
      label: voice.name,
      previewUrl: voice.preview_url,
    })) ?? []
  )
}

const handleSileroApiServerTextToSpeech: TextToSpeechAdapter = async (
  { user, text, voice },
  log,
  guestId
) => {
  const url = getUrl(user, guestId)
  if (voice.service !== 'silero-api-server') throw new Error('Invalid service')
  const payload: SileroApiServerTextToSpeechRequest = {
    speaker: voice.voiceId,
    text,
  }
  const result = await needle('post', `${url}/tts/generate`, payload, {
    json: true,
    headers: {
      accept: 'audio/wav',
    },
  })

  if (result.statusCode !== 200) {
    throw new Error(
      result.body.detail?.msg || `Error ${result.statusCode}: ${JSON.stringify(result.body)}`
    )
  }

  if (!Buffer.isBuffer(result.body)) {
    throw new Error(result.body.message || 'Unexpected non-buffer response')
  }

  return {
    content: result.body,
    ext: 'wav',
  }
}

function getUrl(user: AppSchema.User, guestId: string | undefined) {
  let url: string | undefined
  if (guestId) url = user.sileroApiServerUrl
  else if (user.sileroApiServerUrl) url = user.sileroApiServerUrl!
  if (!url) throw errors.BadRequest
  if (url.endsWith('/')) url = url.slice(0, -1)
  return url
}

export const sileroApiServerHandler = {
  valid,
  getVoices: handleSileroApiServerVoicesList,
  generateVoice: handleSileroApiServerTextToSpeech,
}
