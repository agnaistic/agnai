import { UnwrapBody, assertValid } from '/common/valid'
import { store } from '../../db'
import { createTextStreamV2, getResponseEntities } from '../../adapter/generate'
import { AppRequest, StatusError, errors, handle } from '../wrap'
import { sendGuest, sendMany, sendOne } from '../ws'
import { obtainLock, releaseLock } from './lock'
import { AppSchema } from '../../../common/types/schema'
import { v4 } from 'uuid'
import { Response } from 'express'
import { publishMany } from '../ws/handle'
import { getScenarioEventType } from '/common/scenario'

type GenRequest = UnwrapBody<typeof genValidator>

const sendValidator = {
  kind: [
    'send-noreply',
    'ooc',
    'send-event:world',
    'send-event:character',
    'send-event:hidden',
    'send-event:ooc',
  ],
  text: 'string',
  impersonate: 'any?',
} as const

const genValidator = {
  parent: 'string?',
  kind: [
    'send',
    'send-event:world',
    'send-event:character',
    'send-event:hidden',
    'send-event:ooc',
    'ooc',
    'retry',
    'continue',
    'self',
    'summary',
    'request',
  ],
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
    chatEmbeds: 'any?',
    userEmbeds: 'any?',
  },
  lines: ['string'],
  text: 'string?',
  settings: 'any?',
  lastMessage: 'string?',
  chatEmbeds: 'any?',
  userEmbeds: 'any?',
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
    const newMsg = newMessage(v4(), chatId, body.text, {
      userId: impersonate ? undefined : 'anon',
      characterId: impersonate?._id,
      ooc: body.kind === 'ooc' || body.kind === 'send-event:ooc',
      event: getScenarioEventType(body.kind),
    })
    sendGuest(guest, { type: 'message-created', msg: newMsg, chatId })
  } else {
    const chat = await store.chats.getChatOnly(chatId)
    if (!chat) throw errors.NotFound
    const members = chat.memberIds.concat(chat.userId)

    await ensureBotMembership(chat, members, impersonate)

    const userMsg = await store.msgs.createChatMessage({
      chatId,
      message: body.text,
      characterId: impersonate?._id,
      senderId: userId,
      ooc: body.kind === 'ooc' || body.kind === 'send-event:ooc',
      event: getScenarioEventType(body.kind),
    })

    sendMany(members, { type: 'message-created', msg: userMsg, chatId })
  }

  return { success: true }
})

export const generateMessageV2 = handle(async (req, res) => {
  const { userId, body, params, log } = req
  const requestId = v4()
  const chatId = params.id
  assertValid(genValidator, body)

  if (!userId) {
    return handleGuestGenerate(body, req, res)
  }

  const impersonateId: string | undefined = body.impersonate?._id
  const impersonate: AppSchema.Character | undefined = !impersonateId
    ? undefined
    : impersonateId.startsWith('temp-')
    ? body.impersonate
    : await store.characters.getCharacter(userId, impersonateId)

  const user = await store.users.getUser(userId)
  body.user = user

  const chat = await store.chats.getChatOnly(chatId)
  if (!chat) throw errors.NotFound

  if (body.kind === 'request' && chat.userId !== userId) {
    throw errors.Forbidden
  }

  // Coalesce for backwards compatibly while new UI rolls out
  const replyAs = body.replyAs._id.startsWith('temp-')
    ? body.replyAs
    : await store.characters.getCharacter(chat.userId, body.replyAs._id || body.char._id)

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
  let userMsg: AppSchema.ChatMessage | undefined
  if (body.kind === 'send' || body.kind === 'ooc') {
    await ensureBotMembership(chat, members, impersonate)

    userMsg = await store.msgs.createChatMessage({
      chatId,
      message: body.text!,
      characterId: impersonate?._id,
      senderId: userId,
      ooc: body.kind === 'ooc',
      event: undefined,
    })

    if (body.parent) {
      await store.tree.assignMessageParent({
        chatId: chat._id,
        parentId: body.parent,
        messageId: userMsg._id,
      })
    }

    sendMany(members, { type: 'message-created', msg: userMsg, chatId })
  } else if (body.kind.startsWith('send-event:')) {
    userMsg = await store.msgs.createChatMessage({
      chatId,
      message: body.text!,
      characterId: replyAs?._id,
      senderId: undefined,
      ooc: false,
      event: getScenarioEventType(body.kind),
    })
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
    return res.json({
      requestId,
      success: true,
      generating: false,
      message: 'User message created',
    })
  }

  sendMany(members, {
    type: 'message-creating',
    chatId,
    mode: body.kind,
    senderId: userId,
    characterId: replyAs._id,
  })
  res.json({ requestId, success: true, generating: true, message: 'Generating message' })

  const entities = await getResponseEntities(chat, body.sender.userId, body.settings)
  const { stream, adapter, ...metadata } = await createTextStreamV2(
    { ...body, chat, replyAs, impersonate, requestId, entities },
    log
  )

  log.setBindings({ adapter })

  let generated = ''
  let retries: string[] = []
  let error = false
  let meta = { ctx: metadata.settings.maxContextLength, char: metadata.size, len: metadata.length }

  const messageId =
    body.kind === 'retry'
      ? body.replacing?._id ?? requestId
      : body.kind === 'continue'
      ? body.continuing?._id
      : requestId

  try {
    for await (const gen of stream) {
      if (typeof gen === 'string') {
        generated = gen
        continue
      }

      if ('tokens' in gen) {
        generated = gen.tokens as string
      }

      if ('gens' in gen) {
        retries = gen.gens
        break
      }

      if ('partial' in gen) {
        const prefix = body.kind === 'continue' ? `${body.continuing.msg} ` : ''
        sendMany(members, {
          type: 'message-partial',
          partial: `${prefix}${gen.partial}`,
          adapter,
          chatId,
        })
        continue
      }

      if ('meta' in gen) {
        Object.assign(meta, gen.meta)
        continue
      }

      if ('prompt' in gen) {
        sendOne(userId, { type: 'service-prompt', id: messageId, prompt: gen.prompt })
        continue
      }

      if ('error' in gen) {
        error = true
        sendMany(members, { type: 'message-error', requestId, error: gen.error, adapter, chatId })
        continue
      }

      if ('warning' in gen) {
        sendOne(userId, { type: 'message-warning', requestId, warning: gen.warning })
      }
    }
  } catch (ex: any) {
    error = true

    if (ex instanceof StatusError) {
      log.warn({ err: ex }, `[${ex.status}] Stream handler exception`)
      sendMany(members, {
        type: 'message-error',
        requestId,
        error: `[${ex.status}] Message failed: ${ex?.message || ex}`,
        adapter,
        chatId,
      })
    } else {
      log.error({ err: ex }, 'Unhandled exception occurred during stream handler')
      sendMany(members, {
        type: 'message-error',
        requestId,
        error: `Unhandled exception: ${ex?.message || ex}`,
        adapter,
        chatId,
      })
    }
  }

  if (error) {
    await releaseLock(chatId)
    return
  }

  const responseText = body.kind === 'continue' ? `${body.continuing.msg} ${generated}` : generated

  const actions: AppSchema.ChatAction[] = []

  await releaseLock(chatId)

  switch (body.kind) {
    case 'summary': {
      sendOne(userId, { type: 'chat-summary', chatId, summary: generated })
      break
    }

    case 'self':
    case 'request':
    case 'send-event:world':
    case 'send-event:character':
    case 'send-event:hidden':
    case 'send': {
      const msg = await store.msgs.createChatMessage({
        _id: requestId,
        chatId,
        characterId: replyAs._id,
        senderId: body.kind === 'self' ? userId : undefined,
        message: responseText,
        adapter,
        ooc: false,
        actions,
        meta,
        retries,
        event: undefined,
      })

      if (body.parent && userMsg) {
        await store.tree.assignMessageParent({
          chatId: chat._id,
          parentId: userMsg._id,
          messageId: msg._id,
        })
      }

      sendMany(members, {
        type: 'message-created',
        requestId,
        msg,
        chatId,
        adapter,
        generate: true,
        actions,
      })
      break
    }

    case 'retry': {
      if (body.replacing) {
        await store.msgs.editMessage(body.replacing._id, {
          msg: responseText,
          actions,
          adapter,
          meta,
          state: 'retried',
          retries: body.replacing.retries,
        })
        const nextRetries = [body.replacing.msg]
          .concat(retries)
          .concat(body.replacing.retries || [])
        sendMany(members, {
          type: 'message-retry',
          requestId,
          chatId,
          messageId: body.replacing._id,
          message: responseText,
          retries: nextRetries,
          actions,
          adapter,
          generate: true,
          meta,
        })
      } else {
        const msg = await store.msgs.createChatMessage({
          _id: requestId,
          chatId,
          characterId: replyAs._id,
          message: responseText,
          adapter,
          actions,
          ooc: false,
          meta,
          retries,
          event: undefined,
        })
        sendMany(members, {
          type: 'message-created',
          requestId,
          msg,
          chatId,
          adapter,
          generate: true,
          actions,
        })
      }
      break
    }

    case 'continue': {
      await store.msgs.editMessage(body.continuing._id, {
        msg: responseText,
        adapter,
        meta,
        state: 'continued',
      })
      sendMany(members, {
        type: 'message-retry',
        requestId,
        chatId,
        messageId: body.continuing._id,
        message: responseText,
        adapter,
        generate: true,
        meta,
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

  const requestId = v4()
  const messageId =
    body.kind === 'retry'
      ? body.replacing?._id ?? requestId
      : body.kind === 'continue'
      ? body.continuing?._id
      : requestId

  // Coalesce for backwards compatibly while new UI rolls out
  const replyAs: AppSchema.Character = body.replyAs || body.char

  // For authenticated users we will verify parts of the payload
  let newMsg: AppSchema.ChatMessage | undefined
  if (body.kind === 'send' || body.kind === 'ooc') {
    newMsg = newMessage(v4(), chatId, body.text!, {
      userId: 'anon',
      characterId: body.impersonate?._id,
      ooc: body.kind === 'ooc',
      event: undefined,
    })
  } else if (body.kind.startsWith('send-event:')) {
    newMsg = newMessage(v4(), chatId, body.text!, {
      characterId: replyAs?._id,
      ooc: false,
      event: getScenarioEventType(body.kind),
    })
  }

  if (newMsg) {
    sendGuest(guest, { type: 'message-created', msg: newMsg, chatId })
  }

  if (body.kind === 'ooc') {
    return { success: true }
  }

  res.json({ success: true, generating: true, message: 'Generating message', requestId })

  const { stream, adapter, ...entities } = await createTextStreamV2(
    { ...body, chat, replyAs, requestId },
    log,
    guest
  )

  log.setBindings({ adapter })

  let generated = ''
  let retries: string[] = []
  let error = false
  let meta = { ctx: entities.settings.maxContextLength, char: entities.size, len: entities.length }

  for await (const gen of stream) {
    if (typeof gen === 'string') {
      generated = gen
      continue
    }

    if ('tokens' in gen) {
      generated = gen.tokens as string
    }

    if ('gens' in gen) {
      retries = gen.gens
      break
    }

    if ('partial' in gen) {
      sendGuest(guest, { type: 'message-partial', partial: gen.partial, adapter, chatId })
      continue
    }

    if ('meta' in gen) {
      Object.assign(meta, gen.meta)
      continue
    }

    if ('prompt' in gen) {
      sendGuest(guest, { type: 'service-prompt', id: messageId, prompt: gen.prompt })
      continue
    }

    if ('error' in gen) {
      error = true
      sendGuest(guest, { type: 'message-error', error: gen.error, adapter, chatId })
      break
    }

    if ('warning' in gen) {
      sendGuest(guest, { type: 'message-warning', requestId, warning: gen.warning })
      continue
    }
  }

  if (error) return

  const responseText = body.kind === 'continue' ? `${body.continuing.msg} ${generated}` : generated

  const characterId = body.kind === 'self' ? undefined : body.replyAs?._id || body.char?._id
  const senderId = body.kind === 'self' ? 'anon' : undefined

  if (body.kind === 'retry' && body.replacing) {
    retries = [body.replacing.msg].concat(retries).concat(body.replacing.retries || [])
  }

  const response = newMessage(messageId, chatId, responseText, {
    characterId,
    userId: senderId,
    ooc: false,
    meta,
    event: undefined,
    retries,
  })

  switch (body.kind) {
    case 'summary':
      sendGuest(guest, { type: 'chat-summary', chatId, summary: generated })
      return

    case 'continue':
    case 'request':
    case 'retry':
    case 'self':
    case 'send':
    case 'send-event:world':
    case 'send-event:character':
    case 'send-event:hidden':
      sendGuest(guest, {
        type: 'guest-message-created',
        requestId,
        msg: response,
        chatId,
        adapter,
        continue: body.kind === 'continue',
        generate: true,
        meta,
      })
      return
  }
}

function newMessage(
  messageId: string,
  chatId: string,
  text: string,
  props: {
    userId?: string
    characterId?: string
    ooc: boolean
    meta?: any
    event: undefined | AppSchema.ScenarioEventType
    retries?: string[]
  }
) {
  const userMsg: AppSchema.ChatMessage = {
    _id: messageId,
    chatId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'chat-message',
    retries: props.retries || [],
    msg: text,
    ...props,
  }
  return userMsg
}

async function ensureBotMembership(
  chat: AppSchema.Chat,
  members: string[],
  impersonate: AppSchema.Character | undefined
) {
  const update: Partial<AppSchema.Chat> = {}

  // Ignore ownership of temporary characters
  const characters = chat.characters || {}
  if (
    impersonate &&
    characters[impersonate._id] === undefined &&
    !impersonate._id.startsWith('temp-')
  ) {
    const actual = await store.characters.getCharacter(impersonate.userId, impersonate._id)
    if (!actual) {
      throw new StatusError(
        'Could not create message: Impersonation character does not belong to you',
        403
      )
    }

    // Ensure the caller's character is up to date
    Object.assign(impersonate, actual)
    characters[impersonate._id] = false
    publishMany(members, {
      type: 'chat-character-added',
      chatId: chat._id,
      character: actual,
      active: false,
    })
  }

  update.characters = characters
  await store.chats.update(chat._id, update)
}
