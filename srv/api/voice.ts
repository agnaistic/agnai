import { Router } from 'express'
import { handle } from './wrap'
import { getVoicesList, generateTextToSpeech, getModelsList } from '../voice'
import { store } from '../db'
import { TTSService } from '../../common/types/texttospeech-schema'
import { assertValid } from '/common/valid'

const router = Router()

const textToSpeechValid = { text: 'string', voice: 'any' } as const

const textToSpeech = handle(async ({ body, userId, socketId, log, params }) => {
  const user = userId ? await store.users.getUser(userId) : body.user
  const guestId = userId ? undefined : socketId
  assertValid(textToSpeechValid, body)
  return generateTextToSpeech(user, log, guestId, body.text, body.voice)
})

const getVoices = handle(async ({ body, userId, socketId, log, params }) => {
  const ttsService = params.id as TTSService
  const user = userId ? await store.users.getUser(userId) : body.user
  const guestId = userId ? undefined : socketId
  return getVoicesList({ ttsService: ttsService, user }, log, guestId)
})

const getModels = handle(async ({ body, userId, socketId, log, params }) => {
  const ttsService = params.id as TTSService
  const user = userId ? await store.users.getUser(userId) : body.user
  const guestId = userId ? undefined : socketId
  return getModelsList({ ttsService: ttsService, user }, log, guestId)
})

router.post('/tts', textToSpeech)
router.post('/:id/voices', getVoices)
router.post('/:id/models', getModels)

export default router
