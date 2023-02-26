import { assertValid } from 'frisker'
import { store } from '../../db'
import { logger } from '../../logger'
import { createResponseStream, streamResponse } from '../adapter/generate'
import { errors, handle } from '../handle'
import { publishMany } from '../ws/message'
import { obtainLock, releaseLock, verifyLock } from './lock'

export const createChat = handle(async ({ body, user }) => {
  assertValid(
    {
      characterId: 'string',
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
    },
    body
  )
  const chat = await store.chats.create(body.characterId, { ...body, userId: user?.userId! })
  return chat
})

export const generateMessage = handle(async ({ userId, params, body }, res) => {
  const id = params.id
  assertValid({ message: 'string', history: 'any', ephemeral: 'boolean?', retry: 'boolean?' }, body)

  const lockId = await obtainLock(id)

  const chat = await store.chats.getChat(id)
  if (!chat) {
    throw errors.NotFound
  }

  const members = chat.memberIds.concat(chat.userId)
  if (!members.includes(userId!)) {
    throw errors.Forbidden
  }

  const lockProps = { chatId: id, lockId }

  res.json({ success: true, message: 'Generating message' })
  await verifyLock(lockProps)

  if (!body.retry) {
    const userMsg = await store.chats.createChatMessage({
      chatId: id,
      message: body.message,
      senderId: userId!,
    })
    publishMany(members, { type: 'message-created', msg: userMsg })
  }

  const { stream } = await createResponseStream({
    senderId: userId!,
    chatId: id,
    message: body.message,
    history: body.history,
  })

  let generated = ''

  for await (const gen of stream) {
    logger.debug(gen, 'Generated')
    if (typeof gen === 'string') {
      generated = gen
      publishMany(members, { type: 'message-partial', partial: gen, chatId: id })
      continue
    }

    if (gen.error) {
      publishMany(members, { type: 'message-error', error: gen.error, chatId: id })
      continue
    }
  }

  await verifyLock(lockProps)
  const msg = await store.chats.createChatMessage(
    { chatId: id, message: generated, characterId: chat.characterId },
    body.ephemeral
  )

  publishMany(members, { type: 'message-created', msg })
  await releaseLock(id)
})
