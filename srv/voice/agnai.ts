import needle from 'needle'
import { TextToSpeechAdapter, VoiceListResponse } from './types'
import { AppSchema } from '../../common/types/schema'
import { StatusError, errors } from '../api/wrap'
import { Validator } from '/common/valid'
import { decryptText } from '../db/util'
import { store } from '../db'
import { config } from '../config'

const validator: Validator = {
  service: 'string',
  voiceId: 'string',
  seed: 'string?',
}

const handleAgnaiVoicesList = async (
  user: AppSchema.User,
  guestId: string | undefined
): Promise<VoiceListResponse['voices']> => {
  return []
}

const handleAgnaiTextToSpeech: TextToSpeechAdapter = async (
  { user, text, voice },
  log,
  guestId
) => {
  if (voice.service !== 'agnai') throw new Error('Invalid service')
  const cfg = await store.admin.getServerConfiguration()
  const token = getToken(user, guestId)

  //https://api.novelai.net/ai/generate-voice?text=This%20is%20a%20test%20for%20text%20to%20speech.%20A%20little%20harsh%2C%20a%20little%20slow%2C%20but%20always%20on%20point.&voice=-1&seed=Aini&opus=true&version=v2
  const url = `${cfg.ttsHost}?type=tts&key=${config.auth.inferenceKey}&model=tts&`
  const result = await needle('post', url, JSON.stringify({ text, seed: voice.seed }), {
    json: true,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
    },
  })

  if (result.statusCode !== 200) {
    throw new Error(JSON.stringify(result.body))
  }

  if (!result.body.output) {
    throw new Error(result.body.message || 'Unexpected non-buffer response')
  }

  return {
    content: result.body.output,
    ext: 'url',
  }
}

function getToken(user: AppSchema.User, guestId: string | undefined) {
  let key: string | undefined
  if (guestId) key = user.novelApiKey
  else if (user.novelApiKey) key = decryptText(user.novelApiKey!)
  if (!key) throw errors.Forbidden
  return key
}

export const agnaiTtsHandler = {
  validator,
  getVoices: handleAgnaiVoicesList,
  generateVoice: handleAgnaiTextToSpeech,
  getModels: () => {
    throw new StatusError('Novel AI does not support multiple voice models', 400)
  },
}
