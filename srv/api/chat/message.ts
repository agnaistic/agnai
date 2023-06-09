import { UnwrapBody, assertValid } from '/common/valid'
import { store } from '../../db'
import { createTextStreamV2 } from '../../adapter/generate'
import { AppRequest, errors, handle } from '../wrap'
import { sendGuest, sendMany, sendOne } from '../ws'
import { obtainLock, releaseLock } from './lock'
import { AppSchema } from '../../db/schema'
import { v4 } from 'uuid'
import { Response } from 'express'
import { extractActions } from './common'
import { publishMany } from '../ws/handle'

type GenRequest = UnwrapBody<typeof genValidator>

const sendValidator = {
  kind: ['send-noreply', 'ooc'],
  text: 'string',
  impersonate: 'any?',
} as const

const genValidator = {
  kind: ['send', 'ooc', 'retry', 'continue', 'self', 'summary', 'request'],
  char: 'any',
  sender: 'any',
  members: ['any'],
  user: 'any',
  chat: 'any',
  replacing: 'any?',
  replyAs: 'any?',
  continuing: 'any?',
  characters: 'any?',
  impersonate: 'any?',
  parts: {
    scenario: 'string?',
    persona: 'string',
    greeting: 'string?',
    memory: 'any?',
    sampleChat: ['string?'],
    post: ['string'],
    allPersonas: 'any?',
  },
  lines: ['string'],
  text: 'string?',
  settings: 'any?',
} as const

export const getMessages = handle(async ({ userId, params, query }) => {
  const chatId = params.id

  assertValid({ before: 'string' }, query)
  const before = query.before

  const messages = await store.msgs.getMessages(chatId, before)
  return { messages }
})

export const createMessage = handle(async (req) => {
  const { userId, body, params } = req
  const chatId = params.id
  assertValid(sendValidator, body)

  const impersonate: AppSchema.Character | undefined = body.impersonate

  if (!userId) {
    const guest = req.socketId
    const newMsg = newMessage(chatId, body.text, {
      userId: impersonate ? undefined : 'anon',
      characterId: impersonate?._id,
      ooc: body.kind === 'ooc',
    })
    sendGuest(guest, { type: 'message-created', msg: newMsg, chatId })
  } else {
    const chat = await store.chats.getChatOnly(chatId)
    if (!chat) throw errors.NotFound
    const members = chat.memberIds.concat(chat.userId)

    const update: Partial<AppSchema.Chat> = {}
    if (impersonate) {
      const nextChars = { ...chat.characters }
      if (impersonate._id in nextChars === false) {
        const char = await store.characters.getCharacter(userId, impersonate._id)
        if (!char) throw errors.Forbidden

        // Ensure the character is update to date for authorized users
        Object.assign(impersonate, char)

        nextChars[impersonate._id] = false
        publishMany(members, {
          type: 'chat-character-added',
          chatId,
          character: char,
          active: false,
        })
      }

      update.characters = nextChars
    }

    await store.chats.update(chatId, update)

    const userMsg = await store.msgs.createChatMessage({
      chatId,
      message: body.text,
      characterId: impersonate?._id,
      senderId: userId,
      ooc: body.kind === 'ooc',
    })
    sendMany(members, { type: 'message-created', msg: userMsg, chatId })
  }

  return { success: true }
})

export const generateMessageV2 = handle(async (req, res) => {
  const { userId, body, params, log } = req
  const chatId = params.id
  assertValid(genValidator, body)

  if (!userId) {
    return handleGuestGenerate(body, req, res)
  }

  const impersonate: AppSchema.Character | undefined = body.impersonate
  const user = await store.users.getUser(userId)
  body.user = user

  const chat = await store.chats.getChatOnly(chatId)
  if (!chat) throw errors.NotFound

  if (body.kind === 'request' && chat.userId !== userId) {
    throw errors.Forbidden
  }

  // Coalesce for backwards compatibly while new UI rolls out
  const replyAs = await store.characters.getCharacter(
    chat.userId,
    body.replyAs._id || body.char._id
  )

  if (chat.userId !== userId) {
    const isAllowed = await store.chats.canViewChat(userId, chat)
    if (!isAllowed) throw errors.Forbidden
  }

  const members = chat.memberIds.concat(chat.userId)

  if (body.kind === 'retry' && userId !== chat.userId) {
    throw errors.Forbidden
  }

  if (body.kind === 'continue' && userId !== chat.userId) {
    throw errors.Forbidden
  }

  // For authenticated users we will verify parts of the payload
  if (body.kind === 'send' || body.kind === 'ooc') {
    const update: Partial<AppSchema.Chat> = {}
    if (impersonate) {
      const nextChars = { ...chat.characters }
      if (impersonate._id in nextChars === false) {
        const char = await store.characters.getCharacter(userId, impersonate._id)
        if (!char) throw errors.Forbidden

        // Ensure the character is update to date for authorized users
        Object.assign(impersonate, char)

        nextChars[impersonate._id] = false
        publishMany(members, {
          type: 'chat-character-added',
          chatId,
          character: char,
          active: false,
        })
      }

      update.characters = nextChars
    }

    const userMsg = await store.msgs.createChatMessage({
      chatId,
      message: body.text!,
      characterId: impersonate?._id,
      senderId: userId,
      ooc: body.kind === 'ooc',
    })

    await store.chats.update(chatId, update)
    sendMany(members, { type: 'message-created', msg: userMsg, chatId })
  }

  if (body.kind === 'ooc' || !replyAs) {
    return { success: true }
  }

  /**
   * For group chats we won't worry about lock integrity.
   * We still need to create the user message and broadcast it,
   * but if there is a lock in place do not attempt to generate a message.
   */
  try {
    await obtainLock(chatId)
  } catch (ex) {
    if (members.length === 1) throw ex
    return res.json({ success: true, generating: false, message: 'User message created' })
  }

  sendMany(members, {
    type: 'message-creating',
    chatId,
    mode: body.kind,
    senderId: userId,
    characterId: replyAs._id,
  })
  res.json({ success: true, generating: true, message: 'Generating message' })

  const { stream, adapter } = await createTextStreamV2({ ...body, chat, replyAs, impersonate }, log)

  log.setBindings({ adapter })

  let generated = ''
  let error = false

  for await (const gen of stream) {
    if (typeof gen === 'string') {
      generated = gen
      continue
    }

    if ('partial' in gen) {
      sendMany(members, { type: 'message-partial', partial: gen.partial, adapter, chatId })
      continue
    }

    if (gen.error) {
      error = true
      sendMany(members, { type: 'message-error', error: gen.error, adapter, chatId })
      continue
    }
  }

  if (error) {
    await releaseLock(chatId)
    return
  }

  const responseText = body.kind === 'continue' ? `${body.continuing.msg} ${generated}` : generated
  const actioned = extractActions(responseText)

  await releaseLock(chatId)

  switch (body.kind) {
    case 'summary': {
      sendOne(userId, { type: 'chat-summary', chatId, summary: generated })
      break
    }

    case 'self':
    case 'request':
    case 'send': {
      const msg = await store.msgs.createChatMessage({
        chatId,
        characterId: replyAs._id,
        senderId: body.kind === 'self' ? userId : undefined,
        message: actioned.text,
        adapter,
        ooc: false,
        actions: actioned.actions,
      })
      sendMany(members, {
        type: 'message-created',
        msg,
        chatId,
        adapter,
        generate: true,
        actions: actioned.actions,
      })
      break
    }

    case 'retry': {
      if (body.replacing) {
        await store.msgs.editMessage(body.replacing._id, {
          msg: actioned.text,
          actions: actioned.actions,
          adapter,
        })
        sendMany(members, {
          type: 'message-retry',
          chatId,
          messageId: body.replacing._id,
          message: actioned.text,
          actions: actioned.actions,
          adapter,
          generate: true,
        })
      } else {
        const msg = await store.msgs.createChatMessage({
          chatId,
          characterId: replyAs._id,
          message: generated,
          adapter,
          actions: actioned.actions,
          ooc: false,
        })
        sendMany(members, {
          type: 'message-created',
          msg,
          chatId,
          adapter,
          generate: true,
          actions: actioned.actions,
        })
      }
      break
    }

    case 'continue': {
      await store.msgs.editMessage(body.continuing._id, { msg: responseText, adapter })
      sendMany(members, {
        type: 'message-retry',
        chatId,
        messageId: body.continuing._id,
        message: responseText,
        adapter,
        generate: true,
      })
      break
    }
  }

  await store.chats.update(chatId, {})
})

async function handleGuestGenerate(body: GenRequest, req: AppRequest, res: Response) {
  const chatId = req.params.id
  const guest = req.socketId
  const log = req.log

  const chat: AppSchema.Chat = body.chat
  if (!chat) throw errors.NotFound

  // Coalesce for backwards compatibly while new UI rolls out
  const replyAs: AppSchema.Character = body.replyAs || body.char

  // For authenticated users we will verify parts of the payload
  if (body.kind === 'send' || body.kind === 'ooc') {
    const newMsg = newMessage(chatId, body.text!, {
      userId: 'anon',
      ooc: body.kind === 'ooc',
    })
    sendGuest(guest, { type: 'message-created', msg: newMsg, chatId })
  }

  if (body.kind === 'ooc') {
    return { success: true }
  }

  res.json({ success: true, generating: true, message: 'Generating message' })

  const { stream, adapter } = await createTextStreamV2({ ...body, chat, replyAs }, log, guest)

  log.setBindings({ adapter })

  let generated = ''
  let error = false

  for await (const gen of stream) {
    if (typeof gen === 'string') {
      generated = gen
      continue
    }

    if ('partial' in gen) {
      sendGuest(guest, { type: 'message-partial', partial: gen.partial, adapter, chatId })
      continue
    }

    if (gen.error) {
      error = true
      sendGuest(guest, { type: 'message-error', error: gen.error, adapter, chatId })
      continue
    }
  }

  if (error) return

  const responseText = body.kind === 'continue' ? `${body.continuing.msg} ${generated}` : generated

  const characterId = body.kind === 'self' ? undefined : body.replyAs?._id || body.char?._id
  const senderId = body.kind === 'self' ? 'anon' : undefined
  const response = newMessage(chatId, responseText, { characterId, userId: senderId, ooc: false })

  sendGuest(guest, {
    type: 'guest-message-created',
    msg: response,
    chatId,
    adapter,
    continue: body.kind === 'continue',
    generate: true,
  })
}

function newMessage(
  chatId: string,
  text: string,
  props: { userId?: string; characterId?: string; ooc: boolean }
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
