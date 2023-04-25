import { assertValid } from 'frisker'
import { store } from '../../db'
import { generateVoice } from '../../voice'
import { handle } from '../wrap'
import { AppSchema } from '../../db/schema'

export const textToSpeech = handle(async ({ body, userId, socketId, log, params }) => {
  assertValid(
    {
      user: 'any?',
      text: 'string',
      messageId: 'string?',
      voiceBackend: 'string',
      voiceId: 'string',
    },
    body
  )
  const user = userId ? await store.users.getUser(userId) : body.user

  const guestId = userId ? undefined : socketId
  await generateVoice(
    {
      user,
      text: body.text,
      chatId: params.id,
      messageId: body.messageId,
      voiceBackend: body.voiceBackend as AppSchema.VoiceBackend,
      voiceId: body.voiceId,
    },
    log,
    guestId
  )
  return { success: true }
})
