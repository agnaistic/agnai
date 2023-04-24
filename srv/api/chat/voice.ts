import { assertValid } from 'frisker'
import { store } from '../../db'
import { generateVoice } from '../../voice'
import { handle } from '../wrap'

export const textToSpeech = handle(async ({ body, userId, socketId, log, params }) => {
  assertValid({ user: 'any?', text: 'string', messageId: 'string?', ephemeral: 'boolean?' }, body)
  const user = userId ? await store.users.getUser(userId) : body.user

  const guestId = userId ? undefined : socketId
  await generateVoice(
    {
      user,
      text: body.text,
      chatId: params.id,
      messageId: body.messageId,
      ephemeral: body.ephemeral,
    },
    log,
    guestId
  )
  return { success: true }
})
