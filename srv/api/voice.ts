import { Router } from 'express'
import { handle } from './wrap'
import { getVoicesList } from '../voice'
import { store } from '../db'
import { TextToSpeechBackend } from '../db/texttospeech-schema'

const router = Router()

const getVoices = handle(async ({ body, userId, socketId, log, params }) => {
  const ttsBackend = params.id as TextToSpeechBackend
  const user = userId ? await store.users.getUser(userId) : body.user
  const guestId = userId ? undefined : socketId
  return await getVoicesList({ ttsBackend: ttsBackend, user }, log, guestId)
})

router.post('/:id/voices', getVoices)

export default router
