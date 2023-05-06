import { Router } from 'express'
import { handle } from './wrap'
import { getVoicesList } from '../voice'
import { store } from '../db'
import { TTSService } from '../db/texttospeech-schema'

const router = Router()

const getVoices = handle(async ({ body, userId, socketId, log, params }) => {
  const ttsService = params.id as TTSService
  const user = userId ? await store.users.getUser(userId) : body.user
  const guestId = userId ? undefined : socketId
  return getVoicesList({ ttsService: ttsService, user }, log, guestId)
})

router.post('/:id/voices', getVoices)

export default router
