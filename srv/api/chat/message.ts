import { assertValid } from 'frisker'
import { store } from '../../db'
import { createTextStreamV2 } from '../../adapter/generate'
import { errors, handle } from '../wrap'
import { sendGuest, sendMany } from '../ws'
import { obtainLock, releaseLock } from './lock'
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

  const chat: AppSchema.Chat = guest ? body.chat : await store.chats.getChat(chatId)
  if (!chat) {
    throw errors.NotFound
  }

  const members = guest ? [chat.userId] : chat.memberIds.concat(chat.userId)

  if (userId) {
    if (body.kind === 'retry' && userId !== chat.userId) {
      throw errors.Forbidden
    }

    if (body.kind === 'continue' && userId !== chat.userId) {
      throw errors.Forbidden
    }

    if (!members.includes(userId)) {
      throw errors.Forbidden
    }
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

  /**
   * For group chats we won't worry about lock integrity.
   * We still need to create the user message and broadcast it,
   * but if there is a lock in place do not attempt to generate a message.
   */
  try {
    if (userId) await obtainLock(chatId)
  } catch (ex) {
    if (members.length === 1) throw ex
    return res.json({ success: true, generating: false, message: 'User message created' })
  }

  if (userId) {
    sendMany(members, { type: 'message-creating', chatId })
  }

  res.json({ success: true, generating: true, message: 'Generating message' })

  const { stream, adapter } = await createTextStreamV2({ ...body, chat }, log, guest)

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
      if (!guest) sendMany(members, { type: 'message-error', error: gen.error, adapter, chatId })
      else sendGuest(guest, { type: 'message-error', error: gen.error, adapter, chatId })
      continue
    }
  }

  if (error) {
    await releaseLock(chatId)
    return
  }

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

  await releaseLock(chatId)

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
    await store.msgs.editMessage(body.continuing._id, responseText, adapter)
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
  return res
    .status(400)
    .json({ message: 'Your browser is running on an old version. Please refresh.' })
})

export const retryMessage = handle(async ({ body, params, userId, log }, res) => {
  return res
    .status(400)
    .json({ message: 'Your browser is running on an old version. Please refresh.' })
})

// export const summarizeChat = handle(async (req) => {
//   const chatId = req.params.id
//   const entities = await getResponseEntities(chatId, req.userId!)
//   const prompt = 'TODO' // await createPrompt(entities)

//   const summary = await post({ url: '/summarize', body: { prompt }, host: PY_URL })
//   return { summary }
// })
