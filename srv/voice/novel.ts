import needle from 'needle'
import { TextToSpeechAdapter, VoiceListResponse } from './types'
import { AppSchema } from '../../common/types/schema'
import { StatusError, errors } from '../api/wrap'
import { Validator } from '/common/valid'
import { decryptText } from '../db/util'

const novelBaseUrl = 'https://api.novelai.net/ai/generate-voice'

const validator: Validator = {
  service: 'string',
  voiceId: 'string',
  seed: 'string?',
}

const handleNovelVoicesList = async (
  user: AppSchema.User,
  guestId: string | undefined
): Promise<VoiceListResponse['voices']> => {
  return [
    { name: 'Ligeia', gender: 'Unisex' },
    { name: 'Aini', gender: 'Female' },
    { name: 'Orea', gender: 'Female' },
    { name: 'Claea', gender: 'Female' },
    { name: 'Lim', gender: 'Female' },
    { name: 'Orae', gender: 'Female' },
    { name: 'Naia', gender: 'Female' },
    { name: 'Olon', gender: 'Male' },
    { name: 'Elei', gender: 'Male' },
    { name: 'Ogma', gender: 'Male' },
    { name: 'Reid', gender: 'Male' },
    { name: 'Pega', gender: 'Male' },
    { name: 'Lam', gender: 'Male' },
  ].map((v) => ({
    id: v.name,
    label: `${v.name} (${v.gender})`,
    previewUrl: '',
  }))
}

const handleNovelTextToSpeech: TextToSpeechAdapter = async (
  { user, text, voice },
  log,
  guestId
) => {
  if (voice.service !== 'novel') throw new Error('Invalid service')
  const token = getToken(user, guestId)
  //https://api.novelai.net/ai/generate-voice?text=This%20is%20a%20test%20for%20text%20to%20speech.%20A%20little%20harsh%2C%20a%20little%20slow%2C%20but%20always%20on%20point.&voice=-1&seed=Aini&opus=true&version=v2
  const url = `${novelBaseUrl}?text=${encodeURIComponent(text)}&voice=-1&seed=${
    voice.seed || voice.voiceId
  }&opus=true&version=v2`
  const result = await needle('get', url, null, {
    json: true,
    headers: {
      accept: 'audio/webm',
      authorization: `Bearer ${token}`,
    },
  })

  if (result.statusCode !== 200) {
    throw new Error(JSON.stringify(result.body))
  }

  if (!Buffer.isBuffer(result.body)) {
    throw new Error(result.body.message || 'Unexpected non-buffer response')
  }

  return {
    content: result.body,
    ext: 'webm',
  }
}

function getToken(user: AppSchema.User, guestId: string | undefined) {
  let key: string | undefined
  if (guestId) key = user.novelApiKey
  else if (user.novelApiKey) key = decryptText(user.novelApiKey!)
  if (!key) throw errors.Forbidden
  return key
}

export const novelTtsHandler = {
  validator,
  getVoices: handleNovelVoicesList,
  generateVoice: handleNovelTextToSpeech,
  getModels: () => {
    throw new StatusError('Novel AI does not support multiple voice models', 400)
  },
}
