import { assertValid } from 'frisker'
import { v4 } from 'uuid'
import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { createGuestTextStream } from '../../adapter/generate'
import { errors, handle } from '../wrap'
import { sendGuest } from '../ws'
import { releaseLock } from './lock'

export const guestGenerateMsg = handle(async ({ params, body, log, socketId }, res) => {
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
      lines: ['string?'],
      continue: 'string?',
    },
    body
  )

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
    sendGuest(socketId, { type: 'message-created', msg: userMsg, chatId: id })
  }

  const { stream, adapter } = await createGuestTextStream({ ...body, socketId, log })
  log.setBindings({ adapter })

  let generated = ''
  let error = false
  for await (const gen of stream) {
    if (typeof gen === 'string') {
      generated = gen
      sendGuest(socketId, { type: 'guest-message-partial', partial: gen, chatId: id })
      continue
    }

    if (gen.error) {
      error = true
      sendGuest(socketId, { type: 'message-error', error: gen.error, chatId: id })
      continue
    }
  }

  const responseText = body.continue ? `${body.continue} ${generated}` : generated

  const response: AppSchema.ChatMessage = {
    _id: v4(),
    chatId: id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'chat-message',
    msg: responseText,
    characterId: body.char._id,
  }
  if (!error && generated) {
    sendGuest(socketId, {
      type: 'guest-message-created',
      msg: response,
      chatId: id,
      adapter,
      continue: !!body.continue,
    })
  }

  await store.chats.update(id, {})
  await releaseLock(id)
})
