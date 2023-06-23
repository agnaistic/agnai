import { assertValid } from '/common/valid'
import { store } from '../../db'
import { generateVoice } from '../../voice'
import { handle } from '../wrap'
import { VoiceSettings } from '../../../common/types/texttospeech-schema'

export const textToSpeech = handle(async ({ body, userId, socketId, log, params }) => {
  assertValid(
    {
      user: 'any?',
      text: 'string',
      messageId: 'string?',
      voice: 'any',
      culture: 'string?',
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
      voice: body.voice as VoiceSettings,
      culture: body.culture || 'en-us',
    },
    log,
    guestId
  )
  return { success: true }
})
