import { Router } from 'express'
import { handle } from './wrap'
import { getVoicesList } from '../voice'
import { store } from '../db'
import { AppSchema } from '../db/schema'

const router = Router()

const getVoices = handle(async ({ body, userId, socketId, log, params }) => {
  const voiceBackend = params.id as AppSchema.VoiceBackend
  const user = userId ? await store.users.getUser(userId) : body.user
  const guestId = userId ? undefined : socketId
  return await getVoicesList({ voiceBackend, user }, log, guestId)
})

router.post('/:id/voices', getVoices)

export default router
