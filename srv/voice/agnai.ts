import needle from 'needle'
import { TextToSpeechAdapter, VoiceListResponse } from './types'
import { AppSchema } from '../../common/types/schema'
import { StatusError } from '../api/wrap'
import { Validator } from '/common/valid'
import { decryptText } from '../db/util'
import { store } from '../db'
import { config } from '../config'

const validator: Validator = {
  service: 'string',
  voiceId: 'string',
  seed: 'number?',
}

const handleAgnaiVoicesList = async (
  user: AppSchema.User,
  guestId: string | undefined
): Promise<VoiceListResponse['voices']> => {
  return [
    { label: 'Use Seed', id: 'random' },
    { label: 'Angie', id: 'angie' },
    { label: 'Daniel', id: 'daniel' },
    { label: 'Geralt', id: 'geralt' },
    { label: 'Jennifer', id: 'jlaw' },
    { label: 'Emma', id: 'emma' },
    { label: 'Halle', id: 'halle' },
    { label: 'Denny', id: 'deniro' },
    { label: 'Freeman', id: 'freeman' },
    { label: 'Tom', id: 'tom' },
    { label: 'William', id: 'william' },
  ]
}

const handleAgnaiTextToSpeech: TextToSpeechAdapter = async (
  { user, text, voice },
  log,
  guestId
) => {
  if (voice.service !== 'agnaistic') throw new Error('Invalid service')
  const cfg = await store.admin.getServerConfiguration()

  if (cfg.ttsAccess === 'off') {
    throw new Error(`Voice generation is disabled`)
  }

  let level = user.admin ? 99999 : await store.users.validateSubscription(user)
  if (level === undefined) {
    level = -1
  }

  if (level instanceof Error && cfg.ttsAccess !== 'users') {
    throw level
  }

  if (typeof level !== 'number') {
    level = -1
  }

  switch (cfg.ttsAccess) {
    case 'admins':
      if (!user.admin) {
        throw new StatusError(`Voice generation not allowed`, 403)
      }
      break

    case 'subscribers':
      if (level < 0) {
        throw new StatusError(`Voice generation not allowed`, 403)
      }
      break

    case 'users': {
      if (guestId) {
        throw new StatusError(`Voice generation available to registered users only`, 403)
      }
      break
    }
  }

  const key = (cfg.ttsApiKey ? decryptText(cfg.ttsApiKey) : config.auth.inferenceKey) || ''
  const auth = `id=${user._id}&level=${level}&key=${key}`

  const infix = cfg.ttsHost.includes('?') ? '&' : '?'

  const parts = ['type=voice', `key=${config.auth.inferenceKey}`, auth]

  if (!cfg.ttsHost.includes('model=')) {
    parts.push(`model=voice`)
  }

  const url = `${cfg.ttsHost}${infix}${parts.join('&')}`
  const result = await needle(
    'post',
    url,
    JSON.stringify({ text, seed: voice.seed, voice_id: voice.voiceId }),
    {
      json: true,
      headers: {
        accept: 'application/json',
      },
    }
  )

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

export const agnaiTtsHandler = {
  validator,
  getVoices: handleAgnaiVoicesList,
  generateVoice: handleAgnaiTextToSpeech,
  getModels: () => {
    throw new StatusError('Novel AI does not support multiple voice models', 400)
  },
}
