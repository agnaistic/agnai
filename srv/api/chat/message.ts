import { assertValid } from 'frisker'
import { store } from '../../db'
import { createTextStream, createTextStreamV2, getResponseEntities } from '../../adapter/generate'
import { post, PY_URL } from '../request'
import { errors, handle } from '../wrap'
import { sendGuest, sendMany } from '../ws'
import { obtainLock, releaseLock, verifyLock } from './lock'
import { AppSchema } from '../../db/schema'
import { v4 } from 'uuid'

export const getMessages = handle(async ({ userId, params, query }) => {
  const chatId = params.id

  assertValid({ before: 'string' }, query)
  const before = query.before

  const messages = await store.msgs.getMessages(chatId, before)
  return { messages }
})

export const generateMessageV2 = handle(async ({ userId, body, socketId, params, log }, res) => {
  const chatId = params.id
  assertValid(
    {
      kind: ['send', 'retry', 'continue'],
      char: 'any',
      sender: 'any',
      members: ['any'],
      user: 'any',
      chat: 'any',
      replacing: 'any?',
      continuing: 'any?',
      parts: {
        scenario: 'string?',
        persona: 'string',
        greeting: 'string?',
        memory: 'any?',
        sampleChat: ['string?'],
        gaslight: 'string',
        gaslightHasChat: 'boolean',
        post: ['string'],
      },
      lines: ['string'],
      text: 'string?',
      settings: 'any?',
    },
    body
  )

  if (userId) {
    const user = await store.users.getUser(userId!)
    body.user = user
  }

  const guest = userId ? undefined : socketId

  const lockId = await obtainLock(chatId)

  const chat: AppSchema.Chat = guest ? body.chat : await store.chats.getChat(chatId)
  if (!chat) {
    throw errors.NotFound
  }

  const members = guest ? [chat.userId] : chat.memberIds.concat(chat.userId)
  if (userId && !members.includes(userId)) {
    throw errors.Forbidden
  }

  if (userId) {
    sendMany(members, { type: 'message-creating', chatId })
  }

  // For authenticated users we will verify parts of the payload
  if (body.kind === 'send') {
    if (guest) {
      const newMsg = newMessage(chatId, body.text!, { userId: 'anon' })
      sendGuest(socketId, { type: 'message-created', msg: newMsg, chatId })
    }

    if (userId) {
      const userMsg = await store.msgs.createChatMessage({
        chatId,
        message: body.text!,
        senderId: userId!,
      })

      await store.chats.update(chatId, {})
      sendMany(members, { type: 'message-created', msg: userMsg, chatId })
    }
  }

  res.json({ success: true, message: 'Generating message' })

  const { stream, adapter } = await createTextStreamV2(body, log, guest)
  log.setBindings({ adapter })

  let generated = ''
  let error = false
  for await (const gen of stream) {
    if (typeof gen === 'string') {
      generated = gen
      continue
    }

    if (gen.error) {
      error = true
      sendMany(members, { type: 'message-error', error: gen.error, adapter, chatId })
      continue
    }
  }

  await releaseLock(chatId)
  if (error) return

  const responseText = body.kind === 'continue' ? `${body.continuing.msg} ${generated}` : generated

  if (guest) {
    const response = newMessage(chatId, responseText, { characterId: body.char._id })
    sendGuest(socketId, {
      type: 'guest-message-created',
      msg: response,
      chatId,
      adapter,
      continue: body.kind === 'continue',
    })
    return
  }

  if (body.kind === 'send') {
    const msg = await store.msgs.createChatMessage({
      chatId,
      characterId: body.char._id,
      message: generated,
      adapter,
    })
    sendMany(members, { type: 'message-created', msg, chatId, adapter })
  } else if (body.kind === 'retry') {
    if (body.replacing) {
      await store.msgs.editMessage(body.replacing._id, generated, adapter)
      sendMany(members, {
        type: 'message-retry',
        chatId,
        messageId: body.replacing._id,
        message: responseText,
        adapter,
      })
    } else {
      const msg = await store.msgs.createChatMessage({
        chatId,
        characterId: body.char._id,
        message: generated,
        adapter,
      })
      sendMany(members, { type: 'message-created', msg, chatId, adapter })
    }
  } else if (body.kind === 'continue') {
    await store.msgs.editMessage(body.continuing._id, generated, adapter)
    sendMany(members, {
      type: 'message-retry',
      chatId,
      messageId: body.continuing._id,
      message: responseText,
      adapter,
    })
  }

  await store.chats.update(chatId, {})
})

function newMessage(
  chatId: string,
  text: string,
  props: { userId: string } | { characterId: string }
) {
  const userMsg: AppSchema.ChatMessage = {
    _id: v4(),
    chatId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'chat-message',
    msg: text,
    ...props,
  }
  return userMsg
}
/**
 * V1 response generation routes
 * To be removed
 */

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
  sendMany(members, { type: 'message-creating', chatId: chat._id })
  await verifyLock(lockProps)

  if (!body.retry) {
    const userMsg = await store.msgs.createChatMessage({
      chatId: id,
      message: body.message,
      senderId: userId!,
    })
    await store.chats.update(id, {})
    sendMany(members, { type: 'message-created', msg: userMsg, chatId: id })
  }

  const { stream, adapter } = await createTextStream({
    senderId: userId!,
    chatId: id,
    message: body.message,
    log,
  })

  log.setBindings({ adapter })

  let generated = ''
  let error = false
  for await (const gen of stream) {
    if (typeof gen === 'string') {
      generated = gen
      continue
    }

    if (gen.error) {
      error = true
      sendMany(members, { type: 'message-error', error: gen.error, adapter, chatId: id })
      continue
    }
  }

  await verifyLock(lockProps)

  if (!error && generated) {
    const msg = await store.msgs.createChatMessage(
      { chatId: id, message: generated, characterId: chat.characterId, adapter },
      body.ephemeral
    )
    sendMany(members, { type: 'message-created', msg, chatId: id, adapter })
  }

  await store.chats.update(id, {})
  await releaseLock(id)
})

export const retryMessage = handle(async ({ body, params, userId, log }, res) => {
  const { id, messageId } = params

  assertValid({ message: 'string', continue: 'string?', ephemeral: 'boolean?' }, body)

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
  sendMany(members, { type: 'message-retrying', ...props })

  await verifyLock({ chatId: id, lockId })

  const { stream, adapter } = await createTextStream({
    chatId: params.id,
    message: body.message,
    senderId: userId!,
    log,
    retry: prev.msg,
    continue: body.continue,
  })

  log.setBindings({ adapter })

  let generated = ''
  let error = false

  for await (const gen of stream) {
    if (typeof gen === 'string') {
      generated = gen
      continue
    }

    if (gen.error) {
      error = true
      sendMany(members, { type: 'message-error', error: gen.error, adapter, ...props })
      continue
    }
  }

  const response = body.continue ? `${body.continue} ${generated}` : generated

  if (!body.ephemeral) {
    await verifyLock({ chatId: id, lockId })

    if (!error && generated) {
      await store.msgs.editMessage(messageId, response, adapter)
    }

    await store.chats.update(id, {})
  }

  sendMany(members, {
    type: 'message-retry',
    ...props,
    message: response,
    adapter,
  })

  await releaseLock(id)

  res.end()
})

export const summarizeChat = handle(async (req) => {
  const chatId = req.params.id
  const entities = await getResponseEntities(chatId, req.userId!)
  const prompt = 'TODO' // await createPrompt(entities)

  const summary = await post({ url: '/summarize', body: { prompt }, host: PY_URL })
  return { summary }
})
