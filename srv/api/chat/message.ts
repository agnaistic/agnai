import { UnwrapBody, assertValid } from '/common/valid'
import { store } from '../../db'
import { createChatStream, getGenerationSettings } from '../../adapter/generate'
import { AppRequest, StatusError, errors, handle } from '../wrap'
import { sendGuest, sendMany, sendOne } from '../ws'
import { obtainLock, releaseLock } from './lock'
import { AppSchema } from '../../../common/types/schema'
import { v4 } from 'uuid'
import { getScenarioEventType } from '/common/scenario'
import { HydratedJson, jsonHydrator, parsePartialJson } from '/common/util'
import { getAdapter, resolveScenario } from '/common/prompt'
import { mapPresetsToAdapter } from '/common/presets'
import { isDefaultTemplate, templates } from '/common/presets/templates'

type GenRequest = UnwrapBody<typeof genValidator>
type MsgEntities = Awaited<ReturnType<typeof getMessageEntities>>

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
  parent: 'string?',
  bot: 'boolean?',
} as const

const genValidator = {
  requestId: 'string?',
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
    'chat-query',
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
  linesCount: 'number?',
  text: 'string?',
  settings: 'any?',
  lastMessage: 'string?',
  chatEmbeds: 'any?',
  userEmbeds: 'any?',
  imageData: 'string?',
  jsonSchema: 'any?',
  jsonValues: 'any?',
  response: 'string?',
  eventStream: 'boolean?',
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
      userId: body.bot || impersonate ? undefined : 'anon',
      characterId: impersonate?._id,
      ooc: body.kind === 'ooc' || body.kind === 'send-event:ooc',
      event: getScenarioEventType(body.kind),
      parent: body.parent,
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
      senderId: body.bot ? undefined : userId,
      ooc: body.kind === 'ooc' || body.kind === 'send-event:ooc',
      event: getScenarioEventType(body.kind),
      parent: body.parent,
      name: impersonate?.name,
    })

    await store.chats.update(chatId, { treeLeafId: userMsg._id })

    sendMany(members, { type: 'message-created', msg: userMsg, chatId })
  }

  return { success: true }
})

export const generateMessageV2 = handle(async (req, res) => {
  const { userId, body, params, log } = req
  const chatId = params.id
  assertValid(genValidator, body)

  // if (isGuest(req)) {
  //   return handleGuestGenerate(body, req, res)
  // }

  if (req.authed) {
    body.user = req.authed
  }

  const ents = await getMessageEntities(req)
  const { requestId, messageId, chat, replyAs, impersonate, members } = ents

  if (body.kind === 'request' && chat.userId !== userId) {
    throw errors.Forbidden
  }

  // For authenticated users we will verify parts of the payload
  let userMsg = await createUserMessage(req, ents)

  if (body.kind === 'ooc' || !replyAs) {
    return { success: true }
  }

  /**
   * For group chats we won't worry about lock integrity.
   * We still need to create the user message and broadcast it,
   * but if there is a lock in place do not attempt to generate a message.
   */
  if (!isGuest(req)) {
    // @todo consider locking for guests?
    try {
      await obtainLock(chatId)
    } catch (ex) {
      if (members.length <= 1) throw ex
      return res.json({
        requestId,
        success: true,
        generating: false,
        message: 'User message created',
        messageId,
        created: userMsg,
      })
    }
  }

  if (body.kind !== 'chat-query') {
    sendMsg(ents, {
      type: 'message-creating',
      chatId,
      mode: body.kind,
      senderId: userId,
      characterId: replyAs._id,
    })
  }

  const schema = ents.preset.jsonSource === 'character' ? replyAs.json : ents.preset.json
  const hydrator = ents.preset.jsonEnabled && schema ? jsonHydrator(schema) : undefined

  let hydration: HydratedJson | undefined
  let jsonPartial: any

  let generated = body.response || ''
  let retries: string[] = []
  let error = false
  let adapter = 'local'
  let meta: Record<string, any> = {}
  let probs: any

  // If body.response is defined, it's a "local request" which means the browser handled the generation.
  // When undefined, we'll generate the response
  let signal: AbortController | null = new AbortController()
  if (body.response === undefined) {
    const chatStream = await createChatStream(
      {
        ...body,
        linesCount: body.linesCount,
        chat,
        replyAs,
        impersonate,
        requestId,
        settings: ents.preset,
        book: ents.book,
        resolvedScenario: ents.resolvedScenario,
        chatSchema: schema,
        signal,
      },
      log,
      isGuest(req) ? req.socketId : undefined
    ).catch((err) => ({ err }))

    if ('err' in chatStream) {
      await releaseLock(chatId)
      throw chatStream.err
    }

    const success = {
      requestId,
      success: true,
      generating: true,
      message: 'Generating message',
      messageId,
      created: userMsg,
    }
    if (body.eventStream) {
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()
      res.write(`data: ${JSON.stringify(success)}`)
      res.on('close', () => {
        if (!signal) return
        signal.abort()

        sendMsg(ents, {
          type: 'message-error',
          error: 'inference cancelled by user',
          adapter,
          chatId,
          requestId,
        })

        res.status(499).end()
      })
    } else {
      res.json(success)
    }

    const { stream, ...metadata } = chatStream

    adapter = metadata.adapter

    meta = {
      ctx: metadata.settings.maxContextLength,
      char: metadata.size,
      len: metadata.length,
    }
    log.setBindings({ adapter })

    try {
      for await (const gen of stream) {
        if (!signal || signal.signal.aborted) {
          log.warn(`Breaking due to aborted signal`)
          error = true
          break
        }

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
          if (metadata.json && hydrator) {
            jsonPartial = parsePartialJson(gen.partial) || jsonPartial
            hydration = hydrator(jsonPartial || {})
          }

          sendMsg(ents, {
            requestId: body.requestId,
            type: 'message-partial',
            kind: body.kind,
            partial: hydration ? hydration.response : `${prefix}${gen.partial}`,
            json: hydration,
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
          sendMsgOne(req, { type: 'service-prompt', id: messageId, prompt: gen.prompt })
          continue
        }

        if ('error' in gen) {
          error = true
          sendMsg(ents, { type: 'message-error', requestId, error: gen.error, adapter, chatId })
          continue
        }

        if ('warning' in gen) {
          sendMsgOne(req, { type: 'message-warning', requestId, warning: gen.warning })
        }
      }
    } catch (ex: any) {
      error = true

      if (ex instanceof StatusError) {
        log.warn({ err: ex }, `[${ex.status}] Stream handler exception`)
        sendMsg(ents, {
          type: 'message-error',
          requestId,
          error: `[${ex.status}] Message failed: ${ex?.message || ex}`,
          adapter,
          chatId,
        })
      } else {
        log.error({ err: ex }, 'Unhandled exception occurred during stream handler')
        sendMsg(ents, {
          type: 'message-error',
          requestId,
          error: `Unhandled exception: ${ex?.message || ex}`,
          adapter,
          chatId,
        })
      }
    }

    signal = null

    if (!ents.guest) {
      await releaseLock(chatId)
    }

    if (error) {
      return
    }
  }

  if (meta.probs) {
    probs = meta.probs
    delete meta.probs
  }

  let responseText = body.kind === 'continue' ? `${body.continuing.msg} ${generated}` : generated
  const parent = getNewMessageParent(body, userMsg)

  if (hydration?.response) {
    responseText = hydration.response
  }

  if (body.eventStream) {
    res.write('data: [DONE]')
    res.end()
  }

  signal = null
  const payload = { req, ents, meta, probs, responseText, parent, hydration, adapter, retries }
  if (ents.guest) {
    await handleGuestResponse(payload)
  } else {
    await handleAuthedResponse(payload)
  }
})

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
    parent?: string
    json?: HydratedJson
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
    sendMany(members, {
      type: 'chat-character-added',
      chatId: chat._id,
      character: actual,
      active: false,
    })
  }

  update.characters = characters
  await store.chats.update(chat._id, update)
}

function getNewMessageParent(body: GenRequest, userMsg: AppSchema.ChatMessage | undefined): string {
  switch (body.kind) {
    case 'continue': {
      return body.continuing?.parent
    }

    case 'summary':
    case 'chat-query':
      return ''

    case 'retry':
    case 'request':
      return body.parent || ''

    case 'ooc':
    case 'self':
    case 'send':
    case 'send-event:character':
    case 'send-event:hidden':
    case 'send-event:ooc':
    case 'send-event:world':
      return userMsg?._id || ''
  }
}

async function handleAuthedResponse(opts: {
  req: AppRequest<GenRequest>
  ents: MsgEntities
  responseText: string
  retries: string[]
  parent: string
  meta: any
  hydration: any
  adapter: string
  probs: any
}) {
  const { req, responseText, parent, meta, hydration, ents, adapter, retries, probs } = opts
  const { chatId, replyAs, requestId, senderId } = ents
  const body = req.body

  const updatedAt = new Date().toISOString()
  let treeLeafId = ''

  switch (body.kind) {
    case 'summary': {
      sendMsgOne(req, { type: 'chat-summary', chatId: ents.chatId, summary: responseText })
      break
    }

    case 'chat-query': {
      sendMsgOne(req, {
        type: 'chat-query',
        requestId: body.requestId,
        chatId,
        response: responseText,
      })
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
        senderId,
        message: responseText,
        adapter,
        ooc: false,
        meta,
        retries,
        event: undefined,
        parent,
        json: hydration,
        name: replyAs.name,
      })

      msg.meta.probs = probs

      sendMsg(ents, {
        type: 'message-created',
        requestId,
        msg,
        chatId,
        adapter,
        generate: true,
        json: hydration,
      })
      treeLeafId = requestId
      break
    }

    case 'retry': {
      if (body.replacing) {
        const nextRetries = [body.replacing.msg]
          .concat(retries)
          .concat(body.replacing.retries || [])

        const next = await store.msgs.editMessage(body.replacing._id, {
          msg: responseText,
          adapter,
          meta,
          state: 'retried',
          retries: nextRetries,
          parent: body.parent,
          json: hydration ? hydration : (null as any),
        })
        treeLeafId = body.replacing._id
        meta.probs = probs
        sendMsg(ents, {
          type: 'message-retry',
          requestId,
          chatId,
          messageId: body.replacing._id,
          message: next?.msg,
          retries: next?.retries,
          adapter,
          generate: true,
          meta,
          updatedAt: next?.updatedAt,
          json: hydration,
        })
      } else {
        const msg = await store.msgs.createChatMessage({
          _id: requestId,
          chatId,
          characterId: replyAs._id,
          message: responseText,
          adapter,
          ooc: false,
          meta,
          retries,
          event: undefined,
          parent,
          json: hydration,
          name: replyAs.name,
        })
        msg.meta.probs = probs
        treeLeafId = requestId
        sendMsg(ents, {
          type: 'message-created',
          requestId,
          msg,
          chatId,
          adapter,
          generate: true,
          json: hydration,
        })
      }
      break
    }

    case 'continue': {
      const next = await store.msgs.editMessage(body.continuing._id, {
        msg: responseText,
        adapter,
        meta,
        state: 'continued',
      })
      treeLeafId = body.continuing._id
      meta.probs = probs
      sendMsg(ents, {
        type: 'message-retry',
        requestId,
        chatId,
        messageId: body.continuing._id,
        message: responseText,
        adapter,
        generate: true,
        retries: next?.retries,
        meta,
        updatedAt,
      })
      break
    }
  }

  if (treeLeafId) {
    await store.chats.update(chatId, { treeLeafId, updatedAt })
  } else {
    await store.chats.update(chatId, { updatedAt })
  }
}

async function handleGuestResponse(opts: {
  req: AppRequest<GenRequest>
  ents: MsgEntities
  responseText: string
  retries: string[]
  parent: string
  meta: any
  hydration: any
  adapter: string
}) {
  const { req, responseText, parent, meta, hydration, ents } = opts
  const body = req.body
  let retries = opts.retries.slice()
  if (body.kind === 'retry' && body.replacing) {
    retries = [body.replacing.msg].concat(retries).concat(body.replacing.retries || [])
  }

  const response = newMessage(ents.messageId, ents.chatId, responseText, {
    characterId: ents.replyAs._id,
    userId: ents.senderId,
    ooc: false,
    meta,
    event: undefined,
    retries,
    parent,
    json: hydration,
  })

  switch (body.kind) {
    case 'summary':
      sendMsgOne(req, { type: 'chat-summary', chatId: ents.chatId, summary: responseText })
      return

    case 'continue':
    case 'request':
    case 'retry':
    case 'self':
    case 'send':
    case 'send-event:world':
    case 'send-event:character':
    case 'send-event:hidden':
      sendMsgOne(req, {
        type: 'guest-message-created',
        requestId: ents.requestId,
        msg: response,
        chatId: ents.chatId,
        adapter: opts.adapter,
        continue: body.kind === 'continue',
        generate: true,
        meta,
        json: hydration,
      })
      return
  }
}

async function getMessageEntities(req: AppRequest<GenRequest>) {
  const { body, userId } = req
  const requestId = body.requestId || v4()
  const messageId =
    body.kind === 'retry'
      ? body.replacing?._id ?? requestId
      : body.kind === 'continue'
      ? body.continuing?._id
      : requestId

  if (isGuest(req)) {
    const replyAs = body.replyAs || body.char
    const chat = body.chat
    if (!chat) throw errors.NotFound
    const impersonate = body.impersonate

    return {
      guest: true,
      requestId,
      messageId,
      socketId: req.socketId,
      user: body.user,
      chat,
      chatId: req.params.id,
      mainCharacter: body.char,
      replyAs,
      impersonate,
      preset: body.settings,
      members: [] as string[],
      book: undefined,
      resolvedScenario: undefined,
      senderId: body.kind === 'self' ? 'anon' : undefined,
    }
  }

  const impersonateId: string | undefined = body.impersonate?._id
  const impersonate: AppSchema.Character | undefined = !impersonateId
    ? undefined
    : impersonateId.startsWith('temp-')
    ? body.impersonate
    : await store.characters.getCharacter(userId, impersonateId)

  const chat = await store.chats.getChatOnly(req.params.id)
  if (!chat) throw errors.ChatNotFound

  const mainCharacter = await store.characters.getCharacter(chat.userId, body.char._id)
  if (!mainCharacter) {
    throw errors.CharacterNotFound
  }

  const replyAs: AppSchema.Character = body.replyAs._id.startsWith('temp-')
    ? body.replyAs
    : await store.characters.getCharacter(chat.userId, body.replyAs._id || body.char._id)

  if (chat.userId !== userId) {
    const isAllowed = await store.chats.canViewChat(userId, chat)
    if (!isAllowed) throw errors.Forbidden
  }

  const user = await store.users.getUser(chat.userId)
  if (!user) {
    throw errors.Forbidden
  }

  const { adapter } = getAdapter(chat, user, body.settings)
  const settings = await getGenerationSettings(user, chat, adapter).then((gen) => {
    mapPresetsToAdapter(gen, adapter)
    return gen
  })

  if (settings.promptTemplateId) {
    if (isDefaultTemplate(settings.promptTemplateId)) {
      settings.gaslight = templates[settings.promptTemplateId]
    } else {
      const template = await store.presets.getTemplate(settings.promptTemplateId)
      if (template?.userId === chat.userId) {
        settings.gaslight = template.template
      }
    }
  }

  // `temporary` is client-side managed, so keep the value from the request
  settings.temporary = body.settings.temporary

  const members = chat.memberIds.concat(chat.userId)
  if (body.kind == 'send' || body.kind === 'ooc') {
    await ensureBotMembership(chat, members, impersonate)
  }

  if (body.kind === 'retry' && req.userId !== chat.userId) {
    throw errors.Forbidden
  }

  if (body.kind === 'continue' && req.userId !== chat.userId) {
    throw errors.Forbidden
  }

  const book = chat.memoryId ? await store.memory.getBook(chat.memoryId) : undefined
  const chatScenarios = chat.scenarioIds
    ? await store.scenario.getScenariosById(chat.scenarioIds)
    : []
  const resolvedScenario = resolveScenario(chat, mainCharacter, chatScenarios)

  return {
    guest: false,
    requestId,
    messageId,
    socketId: '',
    user,
    chat,
    preset: settings,
    chatId: req.params.id,
    replyAs,
    impersonate,
    members,
    book,
    resolvedScenario,
    senderId: body.kind === 'self' ? req.userId : undefined,
  }
}

async function createUserMessage(req: AppRequest<GenRequest>, ents: MsgEntities) {
  const { body } = req
  const { chatId, replyAs, impersonate } = ents
  let userMsg: AppSchema.ChatMessage | undefined
  if (isGuest(req)) {
    if (req.body.kind === 'send' || req.body.kind === 'ooc') {
      userMsg = newMessage(v4(), chatId, req.body.text!, {
        userId: 'anon',
        characterId: req.body.impersonate?._id,
        ooc: body.kind === 'ooc',
        event: undefined,
        parent: body.parent,
      })
    } else if (body.kind.startsWith('send-event:')) {
      userMsg = newMessage(v4(), chatId, body.text!, {
        characterId: replyAs?._id,
        ooc: false,
        event: getScenarioEventType(body.kind),
        parent: body.parent,
      })
    }

    if (userMsg) {
      sendMsg(ents, { type: 'message-created', msg: userMsg, chatId })
    }

    return userMsg
  }

  if (body.kind === 'send' || body.kind === 'ooc') {
    userMsg = await store.msgs.createChatMessage({
      chatId,
      message: body.text!,
      characterId: impersonate?._id,
      senderId: req.userId,
      ooc: body.kind === 'ooc',
      event: undefined,
      parent: body.parent,
      name: impersonate?.name,
    })

    sendMsg(ents, { type: 'message-created', msg: userMsg, chatId })
  } else if (body.kind.startsWith('send-event:')) {
    userMsg = await store.msgs.createChatMessage({
      chatId,
      message: body.text!,
      characterId: replyAs?._id,
      senderId: undefined,
      ooc: false,
      event: getScenarioEventType(body.kind),
      parent: body.parent,
      name: replyAs?.name,
    })
    sendMsg(ents, { type: 'message-created', msg: userMsg, chatId })
  }

  if (userMsg) {
    await store.chats.update(chatId, { treeLeafId: userMsg._id, updatedAt: userMsg.updatedAt })
  }

  return userMsg
}

async function sendMsg<T extends { type: string }>(ents: MsgEntities, payload: T) {
  if (ents.guest) {
    return sendGuest(ents.socketId, payload)
  }

  return sendMany(ents.members, payload)
}

async function sendMsgOne<T extends { type: string }>(req: AppRequest, payload: T) {
  if (!req.userId) {
    return sendGuest(req.socketId, payload)
  }

  return sendOne(req.userId, payload)
}

function isGuest(req: AppRequest) {
  return !req.userId
}
