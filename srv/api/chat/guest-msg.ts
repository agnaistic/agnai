import { assertValid } from 'frisker'
import { AI_ADAPTERS } from '../../../common/adapters'
import { store } from '../../db'
import { createGuestTextStream, createTextStream } from '../adapter/generate'
import { errors, handle, StatusError } from '../wrap'
import { publishGuest, publishMany } from '../ws/handle'
import { obtainLock, releaseLock, verifyLock } from './lock'

/**
 * TODO:
 * 1. Both endpoints need to receive the entities:
 * - chat
 * - character
 * - history
 *
 *
 */

export const guestGenerateMsg = handle(async ({ userId, params, body, log, socketId }, res) => {
  if (!socketId) throw errors.Forbidden

  const id = params.id
  assertValid(
    {
      char: 'any',
      chat: 'any',
      user: 'any',
      sender: 'any',
      prompt: 'string',
    },
    body
  )

  const lockId = await obtainLock(id)
  const lockProps = { chatId: id, lockId }

  res.json({ success: true, message: 'Generating message' })
  // publishGuest(socketId, { type: 'message-creating', chatId: body.chat._id })
  await verifyLock(lockProps)

  const { stream } = await createGuestTextStream(body)

  let generated = ''
  let error = false
  for await (const gen of stream) {
    if (typeof gen === 'string') {
      generated = gen
      publishGuest(socketId, { type: 'guest-message-partial', partial: gen, chatId: id })
      continue
    }

    if (gen.error) {
      error = true
      publishGuest(socketId, { type: 'message-error', error: gen.error, chatId: id })
      continue
    }
  }

  await verifyLock(lockProps)

  if (!error && generated) {
    publishGuest(socketId, { type: 'guest-message-created', generated, chatId: id })
  }

  await store.chats.update(id, {})
  await releaseLock(id)
})
