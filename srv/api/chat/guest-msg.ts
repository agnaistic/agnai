import { assertValid } from 'frisker'
import { v4 } from 'uuid'
import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { createGuestTextStream } from '../adapter/generate'
import { errors, handle } from '../wrap'
import { publishGuest } from '../ws/handle'
import { obtainLock, releaseLock, verifyLock } from './lock'

export const guestGenerateMsg = handle(async ({ userId, params, body, log, socketId }, res) => {
  if (!socketId) throw errors.Forbidden

  const id = params.id
  assertValid(
    {
      char: 'any',
      chat: 'any',
      user: 'any',
      sender: 'any',
      message: 'string',
      prompt: 'string',
      retry: 'boolean?',
    },
    body
  )

  const lockId = await obtainLock(id)
  const lockProps = { chatId: id, lockId }

  res.json({ success: true, message: 'Generating message' })

  // User hit 'enter' -- we will mimic creating a new user-genered message
  // This is to allow the front-end to have simplier logic
  if (!body.retry) {
    const userMsg: AppSchema.ChatMessage = {
      _id: v4(),
      chatId: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kind: 'chat-message',
      msg: body.message,
      userId: 'anon',
    }
    publishGuest(socketId, { type: 'message-created', msg: userMsg, chatId: id })
  }

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

  const response: AppSchema.ChatMessage = {
    _id: v4(),
    chatId: id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'chat-message',
    msg: generated,
    characterId: body.char._id,
  }
  if (!error && generated) {
    publishGuest(socketId, { type: 'guest-message-created', msg: response, chatId: id })
  }

  await store.chats.update(id, {})
  await releaseLock(id)
})
