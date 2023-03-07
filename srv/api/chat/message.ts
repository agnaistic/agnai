import { assertValid } from 'frisker'
import { store } from '../../db'
import { createTextStream, getResponseEntities } from '../adapter/generate'
import { createPrompt } from '../adapter/prompt'
import { post, PY_URL } from '../request'
import { errors, handle } from '../wrap'
import { publishMany } from '../ws/handle'
import { obtainLock, releaseLock, verifyLock } from './lock'

export const generateMessage = handle(async ({ userId, params, body, log }, res) => {
  const id = params.id
  assertValid({ message: 'string', ephemeral: 'boolean?', retry: 'boolean?' }, body)

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
  publishMany(members, { type: 'message-creating', chatId: chat._id })
  await verifyLock(lockProps)

  if (!body.retry) {
    const userMsg = await store.chats.createChatMessage({
      chatId: id,
      message: body.message,
      senderId: userId!,
    })
    await store.chats.update(id, {})
    publishMany(members, { type: 'message-created', msg: userMsg, chatId: id })
  }

  const { stream } = await createTextStream({
    senderId: userId!,
    chatId: id,
    message: body.message,
    log,
  })

  let generated = ''
  let error = false
  for await (const gen of stream) {
    if (typeof gen === 'string') {
      generated = gen
      publishMany(members, { type: 'message-partial', partial: gen, chatId: id })
      continue
    }

    if (gen.error) {
      error = true
      publishMany(members, { type: 'message-error', error: gen.error, chatId: id })
      continue
    }
  }

  await verifyLock(lockProps)

  if (!error && generated) {
    const msg = await store.chats.createChatMessage(
      { chatId: id, message: generated, characterId: chat.characterId },
      body.ephemeral
    )
    publishMany(members, { type: 'message-created', msg, chatId: id })
  }

  await store.chats.update(id, {})
  await releaseLock(id)
})

export const retryMessage = handle(async ({ body, params, userId, log }, res) => {
  const { id, messageId } = params

  assertValid({ message: 'string', ephemeral: 'boolean?' }, body)

  const lockId = await obtainLock(id)

  const prev = await store.chats.getMessageAndChat(messageId)
  if (!prev || !prev.chat || !prev.msg) throw errors.NotFound

  // Only the chat owner can retry messages
  if (userId !== prev.chat.userId) {
    throw errors.Forbidden
  }

  const members = prev.chat.memberIds.concat(prev.chat.userId)
  if (!members.includes(userId!)) throw errors.Forbidden

  res.json({ success: true, message: 'Re-generating message' })

  const props = { chatId: id, messageId }
  publishMany(members, { type: 'message-retrying', ...props })

  await verifyLock({ chatId: id, lockId })

  const { stream } = await createTextStream({
    chatId: params.id,
    message: body.message,
    senderId: userId!,
    log,
    retry: prev.msg,
  })

  let generated = ''
  let error = false

  for await (const gen of stream) {
    if (typeof gen === 'string') {
      generated = gen
      publishMany(members, { type: 'message-partial', partial: gen, ...props })
      continue
    }

    if (gen.error) {
      error = true
      publishMany(members, { type: 'message-error', error: gen.error, ...props })
      continue
    }
  }

  if (!body.ephemeral) {
    await verifyLock({ chatId: id, lockId })

    if (!error && generated) {
      await store.chats.editMessage(messageId, generated)
    }

    await store.chats.update(id, {})
  }

  publishMany(members, {
    type: 'message-retry',
    ...props,
    message: generated,
  })

  await releaseLock(id)

  res.end()
})

export const summarizeChat = handle(async (req) => {
  const chatId = req.params.id
  const entities = await getResponseEntities(chatId, req.userId!)
  const prompt = await createPrompt(entities)

  const summary = await post({ url: '/summarize', body: { prompt }, host: PY_URL })
  return { summary }
})
