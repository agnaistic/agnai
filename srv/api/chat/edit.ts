import { assertValid } from 'frisker'
import { ADAPTERS } from '../../../common/adapters'
import { store } from '../../db'
import { logger } from '../../logger'
import { createResponseStream, streamResponse } from '../adapter/generate'
import { errors, handle } from '../handle'
import { publishMany } from '../ws/message'
import { obtainLock, releaseLock, verifyLock } from './lock'

export const updateChat = handle(async ({ params, body, user }) => {
  assertValid(
    {
      name: 'string',
      adapter: ADAPTERS,
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
      overrides: {
        kind: ['wpp', 'sbf', 'boostyle'],
        attributes: 'any',
      },
    },
    body
  )
  const id = params.id
  const prev = await store.chats.getChat(id)
  if (prev?.userId !== user?.userId) throw errors.Forbidden

  const chat = await store.chats.update(id, body)
  return chat
})

export const updateMessage = handle(async ({ body, params, userId }) => {
  assertValid({ message: 'string' }, body)
  const prev = await store.chats.getMessageAndChat(params.id)

  if (!prev) throw errors.NotFound
  if (prev.chat?.userId !== userId) throw errors.Forbidden

  const message = await store.chats.editMessage(params.id, body.message)
  return message
})

export const retryMessage = handle(async ({ body, params, userId }, res) => {
  const { id, messageId } = params

  assertValid(
    {
      history: 'any',
      message: 'string',
      ephemeral: 'boolean?',
    },
    body
  )

  const lockId = await obtainLock(id)

  const prev = await store.chats.getMessageAndChat(messageId)
  if (!prev || !prev.chat) throw errors.NotFound

  const members = prev.chat.memberIds.concat(prev.chat.userId)
  if (!members.includes(userId!)) throw errors.Forbidden

  res.json({ success: true, message: 'Re-generating message' })

  await verifyLock({ chatId: id, lockId })

  const { stream } = await createResponseStream({
    chatId: params.id,
    history: body.history,
    message: body.message,
    senderId: userId!,
  })

  const props = { chatId: id, messageId }
  let generated = ''

  for await (const gen of stream) {
    logger.debug(gen, 'Generated')
    if (typeof gen === 'string') {
      generated = gen
      publishMany(members, { type: 'message-partial', partial: gen, ...props })
      continue
    }

    if (gen.error) {
      publishMany(members, { type: 'message-error', error: gen.error, ...props })
    }
  }

  if (!body.ephemeral) {
    await verifyLock({ chatId: id, lockId })
    await store.chats.editMessage(messageId, generated)
  }

  publishMany(members, {
    type: 'message-retry',
    ...props,
    message: generated,
  })

  await releaseLock(id)

  res.end()
})
