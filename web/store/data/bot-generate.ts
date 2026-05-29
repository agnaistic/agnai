import { v4 } from 'uuid'
import { isLoggedIn } from '../api'
import { getStore } from '../create'
import { localApi } from './storage'
import {
  buildPromptPlaceholders,
  createPromptParts,
  getLinesForPrompt,
  getPromptHistory,
  getTemplate,
  InferenceState,
  JsonField,
  JsonOutput,
  PromptOpts,
  registerTemplateLocator,
  resolveScenario,
  TickHandler,
} from '/common/prompt'
import { parseTemplate } from '/common/template-parser'
import { countTokens, getEncoder } from '/common/tokenize'
import { AppSchema } from '/common/types'
import { UserEmbed } from '/common/types/memory'
import { GenerateRequestV2, HistoryLine } from '/srv/adapter/type'
import { getPromptEntities, PromptEntities } from './common'
import { embedApi } from '../embeddings'
import { ChatDetail } from '../chat'
import { BUILTIN_FORMATS, replaceTags } from '/common/presets/templates'
import { getServiceTempConfig } from '/web/shared/adapter'
import { getActiveBots } from '/web/pages/Chat/util'
import iconv from 'iconv-lite'
import { genApi } from './inference'
import { localEmit } from '../socket'
import { getProviderConnection } from '/common/providers'
import { stripImageContent, toChatMessages } from '/common/template-messages'
import { msgsApi } from './messages'
import { getProvider } from '../preset-context'
import { getLocalPayload, getStoppingStrings } from '/common/requests/payloads'
import { sanitiseAndTrim } from '/common/requests/util'
import { toastStore } from '../toasts'
import { inline, LazyPromise, lazyPromise, round } from '/common/util'
import type { ResponseState } from '../response'
import { EVENTS, events } from '/web/emitter'
import { debug } from '/common/debug'
import { formatJsonSchemaVars, prepareJsonSchema } from '/common/guidance/json-schema'
import { getJsonSchema } from '/web/shared/util'
import { ResponseSchema } from '/common/types/library'

iconv.enableStreamingAPI(require('stream'))

registerTemplateLocator((id: string) => {
  const list = getStore('presets').getState().templates
  const match = list.find((t) => t._id === id)
  return match
})

export const botGen = {
  stream: streamResponse,
  getActivePromptOptions,
  getMessageParent,
}

export type GenerateOpts = { signal: AbortController; hint?: string; systemPrompt?: string } & /**
 * A user sending a new message
 */ (
  | { kind: 'send'; text: string; messageId?: string }
  | { kind: EventKind; text: string }
  | { kind: 'send-noreply'; text: string }
  | { kind: 'ooc'; text: string; messageId?: string }
  /**
   * A user request a message from a character
   */
  | { kind: 'request'; characterId: string }
  /**
   * Either:
   * - The last message in the chat is a user message so we are going to generate a new response
   * - The last message in the chat is a bot message so we are going to re-generate a response and update the 'replacingId' chat message
   */
  | { kind: 'retry'; messageId?: string; reschema_prompt?: string }
  /**
   * The last message in the chat is a bot message and we want to generate more text for this message.
   */
  | { kind: 'continue'; retry?: boolean }
  /**
   * Generate a message on behalf of the user
   */
  | { kind: 'self' }
  | { kind: 'summary'; text: string; assistant?: string; messageId?: string }
  | {
      kind: 'chat-query'
      messageId?: string
      text: string
      assistant?: string
      schema?: JsonField[]
    }
)

type ChatRequest = Awaited<ReturnType<typeof buildChatRequest>>
type StreamOpts = Exclude<GenerateOpts, { type: 'ooc' | 'send-noreply' | 'send-event:ooc' }> & {
  onTick?: TickHandler
}

async function streamResponse(opts: StreamOpts) {
  const { details, lastChatId } = getStore('chat').getState()
  const active = details[lastChatId]
  if (!active) {
    return localApi.error('No active chat. Try refreshing.')
  }

  const req = await buildChatRequest(opts)
  const { messages, assembled } = await toChatMessages(req.request, countTokens)

  if (opts.kind === 'chat-query') {
    const assistant = opts.assistant || 'Chat Query'

    messages.push({
      role: 'user',
      content: `${assistant}: ${opts.text}`,
    })
  }

  if (opts.kind === 'summary') {
    messages.push({
      role: 'user',
      content: `${opts.assistant || 'Chat Summary Query'}`,
    })
  }

  if (assembled.sections.warnings.noHistory) {
    return localApi.error(
      `Your prompt template does not contain the 'chat history' placeholder. Please fix your prompt template.`
    )
  }

  if (assembled.linesAddedCount === 0 && req.prompt.lines.length) {
    return localApi.error(
      `Could not fit any messages in prompt. Check your character definition, context size, and template`
    )
  }

  const lazy = lazyPromise()

  await handlePreStreamResponse(opts, req)

  const meta: any = {
    start: Date.now(),
    ctx: req.entities.settings.maxContextLength,
    len: req.prompt.template.length,
  }

  if (req.entities.settings.streamResponse) {
    meta.wait = 0
  }

  const provider = getProvider(req.entities.settings?.providerId)
  const conn = provider ? getProviderConnection(provider) : undefined

  const payload = conn?.local
    ? getLocalPayload({
        ...req.request,
        messages: messages,
        prompt: assembled.prompt,
      })
    : undefined

  let prefix = req.request.continuing?.msg || ''
  if (prefix) {
    prefix += ' '
  }

  const stops = getStoppingStrings(req.request, req.entities.settings)
  const sanitize = (text: string) =>
    sanitiseAndTrim({
      char: req.props.replyAs,
      members: req.entities.members,
      gen: req.request.settings!,
      text,
      stops,
    })

  const format = req.request.settings?.modelFormat
  if (stops.length < 4 && format) {
    const tags = BUILTIN_FORMATS[format]
    if (tags?.closeBot?.trim()) stops.push(tags.closeBot)
    if (tags?.closeUser?.trim()) stops.push(tags.closeUser)
  }

  const messageId = req.request.replacing?._id || req.request.requestId
  waiting({
    mode: opts.kind,
    characterId: req.request.replyAs._id,
    chatId: req.request.chat._id,
    started: Date.now(),
    input: req.request.text,
    messageId,
    signal: opts.signal,
    userId: undefined, // Do we ever need this?
  })

  localEmit({
    type: 'service-prompt',
    id: messageId,
    prompt: JSON.stringify(stripImageContent(messages), null, 2),
  })

  const jsonSchema =
    opts.kind === 'chat-query' || req.entities.settings.jsonEnabled === 'standard'
      ? req.schema?.schema
      : undefined

  await genApi.inferenceStream(
    {
      settings: req.request.settings,
      jsonSchema,
      messages: messages,
      prompt: assembled.prompt,
      payload,
      signal: opts.signal,
      stop: stops,
      chatId: req.request.chat._id,
    },
    async (response, state, json) => {
      await handleStreamTick(
        { opts, req, lazy, meta, active, sanitize, jsonCall: !!jsonSchema },
        { response, state, json }
      )
    }
  )

  /** In development: Performing JSON output in a separate call if specified by the schema */

  if (
    opts.kind !== 'chat-query' &&
    req.entities.settings.jsonEnabled === 'separate' &&
    req.schema
  ) {
    await genApi.inferenceStream(
      {
        settings: req.entities.presets.json || req.request.settings,
        jsonSchema: req.schema.schema,
        messages: messages,
        prompt: assembled.prompt,
        payload,
        signal: opts.signal,
        stop: stops,
        chatId: req.request.chat._id,
      },
      async (response, state, json) => {
        await handleSecondaryStreamTick(
          { opts, req, lazy, meta, active, sanitize, jsonCall: true },
          { response, state, json }
        )
      }
    )
  }

  waiting(undefined)
  return lazy.promise
}

async function handleStreamTick(
  input: {
    opts: StreamOpts
    req: ChatRequest
    lazy: LazyPromise
    meta: any
    active: { chat: AppSchema.Chat }
    sanitize: (text: string) => string
    jsonCall?: boolean
  },
  tick: { state: InferenceState; response: string; json?: JsonOutput }
) {
  const { opts, req, active, sanitize, meta } = input

  let prefix = input.req.request.continuing?.msg || ''
  if (prefix) {
    prefix += ' '
  }

  switch (tick.state) {
    case 'error':
      input.lazy.reject(tick.response)
      toastStore.error(tick.response)
      // waiting(undefined)
      break

    case 'meta':
      Object.assign(input.meta, tick.json)
      break

    case 'headers': {
      input.lazy.resolve({
        generating: true,
        input: input.opts.kind === 'send' ? input.opts.text : undefined,
        requestId: req.request.requestId,
      })
      break
    }

    case 'partial': {
      if (meta.wait === 0) meta.wait = round((Date.now() - meta.start) / 1000)
      const trimmed = sanitize(prefix + tick.response)
      if (req.request.settings?.streamResponse) {
        const hydrated = input.jsonCall ? req.schema?.hydrator?.(trimmed) : undefined

        if (hydrated) {
          tick.json = hydrated
        }

        if (opts.kind === 'chat-query') break

        localEmit({
          type: 'message-partial',
          chatId: active.chat._id,
          partial: tick.json?.response || trimmed,
          json: tick.json,
          partialId: req.request.requestId,
        })
      }
      break
    }

    case 'thought': {
      if (meta.wait === 0) meta.wait = round((Date.now() - meta.start) / 1000)
      if (opts.kind === 'chat-query') break
      localEmit({
        type: 'inference-thought',
        chatId: active.chat._id,
        thought: tick.response,
        partialId: req.request.requestId,
      })
      break
    }

    case 'done': {
      const trimmed = sanitize(prefix + tick.response)
      const hydrated = input.jsonCall ? req.schema?.hydrator?.(trimmed) : undefined

      if (hydrated) {
        tick.json = hydrated
        console.log(inline(tick.json))
      }

      await handlePostStreamResponse({
        opts,
        req,
        response: trimmed,
        meta: input.meta,
        json: tick.json,
        jsonCall: input.jsonCall,
      })

      break
    }
  }

  opts.onTick?.(tick.response, tick.state, tick.json)
}

/** This is used exclusively by JSON structured responses */
async function handleSecondaryStreamTick(
  input: {
    opts: StreamOpts
    req: ChatRequest
    lazy: LazyPromise
    meta: any
    active: { chat: AppSchema.Chat }
    sanitize: (text: string) => string
    jsonCall?: boolean
  },
  tick: { state: InferenceState; response: string; json?: JsonOutput }
) {
  const { req, sanitize } = input
  const messageId = req.request.replacing?._id || req.request.requestId
  const chatId = req.request.chat._id

  let prefix = input.req.request.continuing?.msg || ''
  if (prefix) {
    prefix += ' '
  }

  switch (tick.state) {
    case 'error':
      toastStore.warn(`JSON response failed: ${tick.response}`)
      // waiting(undefined)
      break

    case 'meta':
      Object.assign(input.meta, tick.json)
      break

    case 'headers': {
      break
    }

    case 'partial': {
      // const trimmed = sanitize(prefix + tick.response)
      // const hydrated = req.schema?.hydrator?.(trimmed)

      // if (hydrated) {
      //   console.log(hydrated)
      // }
      break
    }

    case 'done': {
      const trimmed = sanitize(prefix + tick.response)
      const hydrated = input.jsonCall ? req.schema?.hydrator?.(trimmed) : undefined

      if (!hydrated) break

      tick.json = hydrated
      console.log(inline(tick.json))
      // waiting(undefined)

      const update: Partial<AppSchema.ChatMessage> = { json: tick.json }
      if (hydrated.imageCaption) {
        update.imagePrompt = hydrated.imageCaption
      }

      await msgsApi.editMessageProps({ _id: messageId, chatId }, update)
      break
    }
  }
}

async function handlePreStreamResponse(opts: StreamOpts, req: ChatRequest) {
  if (opts.kind !== 'ooc' && opts.kind !== 'send') return
  if (opts.messageId) return { messageId: opts.messageId }
}

async function handlePostStreamResponse(input: {
  opts: StreamOpts
  req: ChatRequest
  response: string
  meta: any
  json?: JsonOutput
  jsonCall?: boolean
}) {
  const { req, opts, response, json, meta } = input

  if (opts.signal.signal.aborted) {
    getStore('responses').setState({
      retrying: undefined,
      partial: undefined,
    })

    if (!response?.trim()) {
      return
    }
    // console.log('aborted -- ignoring post stream handler')
    // return
  }

  const { replacing, parent, replyAs, continuing } = req.request
  const messageId = replacing?._id || req.request.requestId
  const chatId = req.request.chat._id

  /**
   * Handle exceptions to message creations in here
   * `break` if we need to create a new message
   */
  switch (opts.kind) {
    case 'retry': {
      if (!replacing) {
        break
      }

      const retries = [replacing.msg].concat(replacing.retries || [])
      const payload: Partial<AppSchema.ChatMessage> = {
        msg: response,
        json,
        retries,
        state: 'retried',
        meta,
      }

      await msgsApi.editMessageProps(replacing, { ...payload, assignTree: true })
      return
    }

    case 'continue': {
      if (!continuing) {
        throw new Error(`Unable to update message: Source message not found`)
      }

      await msgsApi.editMessageProps(continuing, {
        msg: response,
        state: 'continued',
        meta,
        assignTree: true,
      })

      return
    }

    case 'chat-query': {
      if (!opts.messageId || !input.json) return

      const update: Partial<AppSchema.ChatMessage> = { json: input.json }
      if (input.json.imageCaption) {
        update.imagePrompt = input.json.imageCaption
      }

      await msgsApi.editMessageProps({ _id: opts.messageId, chatId }, update)
      return
    }

    case 'ooc':
    case 'send-event:ooc':
    case 'send-noreply':
    case 'summary':
      // Intentional NOOP
      return

    case 'request':
    case 'send':
    case 'self':
    case 'send-event:world':
    case 'send-event:character':
    case 'send-event:hidden': {
      if (messageId) {
        getStore('chat').forkChat(messageId)
      }
      break
    }
  }

  if (input.jsonCall) {
    await msgsApi.editMessageProps({ _id: messageId, chatId }, { json })
  }

  req.request.response = response

  await msgsApi.createMessage({
    kind: opts.kind.startsWith('send-event') ? opts.kind : 'send-noreply',
    chatId,
    messageId,
    text: response,
    parent,
    character: replyAs,
    bot: true,
    meta,
    json,
  })

  getStore('responses').setState({
    retrying: undefined,
    partial: undefined,
  })
}

async function buildChatRequest(opts: GenerateOpts) {
  const activePrompt = await createActiveChatPrompt(opts).catch((err) => ({ err }))
  if ('err' in activePrompt) {
    console.error(activePrompt.err)
    throw new Error(activePrompt.err.message || activePrompt.err)
  }

  const { prompt, props, entities, chatEmbeds, userEmbeds, schema } = activePrompt

  const request: GenerateRequestV2 = {
    requestId: v4(),
    kind: opts.kind,
    chat: entities.chat,
    user: entities.user,
    systemPrompt: opts.systemPrompt,
    char: removeAvatar(entities.char),
    sender: removeAvatar(entities.profile),
    members: entities.members.map(removeAvatar),
    parts: prompt.parts,
    text:
      opts.kind === 'chat-query' ||
      opts.kind === 'send' ||
      opts.kind === 'send-event:world' ||
      opts.kind === 'send-event:character' ||
      opts.kind === 'send-event:hidden'
        ? opts.text
        : undefined,
    lines: prompt.lines.map((l) => l.msg),
    history: prompt.lines,
    linesCount: props.messages.length,
    settings: entities.settings,
    replacing: props.replacing,
    continuing: props.continuing,
    replyAs: removeAvatar(props.replyAs),
    impersonate: removeAvatar(props.impersonate),
    characters: removeAvatars(entities.characters),
    parent: props.parent?._id,
    lastMessage: props.lastMessage?.date,
    chatEmbeds,
    userEmbeds,
    jsonValues: props.json,
    reschemaPrompt: props.reschemaPrompt,
    eventStream: true,
    jsonSchema: schema?.schema,
  }

  const stops = getStoppingStrings(request, request.settings)
  request.settings!.stopSequences = stops

  if (
    opts.kind === 'send' ||
    opts.kind === 'request' ||
    opts.kind === 'continue' ||
    opts.kind === 'retry' ||
    opts.kind === 'self' ||
    opts.kind === 'chat-query' ||
    opts.kind === 'summary'
  ) {
    request.attachments = entities.attachments
  }

  return { request, prompt, entities, activePrompt, props, schema }
}

async function getActivePromptOptions(
  opts: Exclude<GenerateOpts, { kind: 'ooc' | 'send-noreply' }>
) {
  const { details, lastChatId } = getStore('chat').getState()
  const active = details[lastChatId]

  const promptState = getStore('prompt').getState()

  if (!active) {
    throw new Error('No active chat. Try refreshing')
  }

  const props = await getGenerateProps(opts, active)
  const entities = props.entities

  const resolvedScenario = resolveScenario(entities.chat, entities.char, entities.scenarios || [])

  const encoder = await getEncoder()

  const promptOpts = {
    kind: opts.kind,
    char: entities.char,
    characters: entities.characters,
    chat: entities.chat,
    sender: entities.profile,
    members: entities.members,
    replyAs: props.replyAs,
    user: entities.user,
    userEmbeds: [],
    books: entities.books,
    continue: props.continue,
    impersonate: entities.impersonating,
    chatEmbeds: [],
    settings: entities.settings,
    messages: entities.messages,
    lastMessage: props.lastMessage?.date || '',
    resolvedScenario,
    jsonValues: props.json,
  }

  const schemaSrc =
    entities.settings.jsonSource === 'character' ? props.replyAs.json : entities.settings.json

  const schema = schemaSrc?.schema?.length ? formatJsonSchemaVars(schemaSrc, promptOpts) : undefined

  const { lines } = await getLinesForPrompt(promptOpts, encoder)
  const parts = await buildPromptPlaceholders(promptOpts, lines, encoder)

  parts.props = {
    hint: promptState.hintsEnabled ? promptState.hint : '',
  }

  return { lines, parts, entities, props, schema }
}

type EventKind =
  | 'send-event:world'
  | 'send-event:character'
  | 'send-event:hidden'
  | 'send-event:ooc'

async function createActiveChatPrompt(opts: GenerateOpts) {
  const { details, lastChatId } = getStore('chat').getState()
  const active = details[lastChatId]

  const { ui } = getStore('user').getState()

  if (!active) {
    throw new Error('No active chat. Try refreshing')
  }

  const props = await getGenerateProps(opts, active)
  const entities = props.entities
  const template = getTemplate({
    settings:
      opts.kind === 'chat-query'
        ? entities.presets.json
        : opts.kind === 'summary'
        ? entities.presets.summary
        : entities.settings,
    chat: entities.chat,
  })

  const resolvedScenario = resolveScenario(entities.chat, entities.char, entities.scenarios || [])

  const chatEmbeds: UserEmbed<{ name: string }>[] = []
  const userEmbeds: UserEmbed[] = []

  const text =
    opts.kind === 'send' ||
    opts.kind === 'send-event:world' ||
    opts.kind === 'send-event:character' ||
    opts.kind === 'send-event:hidden'
      ? opts.text
      : entities.lastMessage?.msg

  const encoder = await getEncoder()

  const presetDefs = getJsonSchema({
    characterId: props.replacing?.characterId,
    preset: entities.presets.current,
  })

  const realDefs: ResponseSchema | undefined =
    opts.kind === 'chat-query' && opts.schema?.length
      ? {
          schema: opts.schema,
          history: '',
          response: '',
          imageCaption: '',
          systemPrompt: '',
          jailbreak: '',
        }
      : presetDefs?.schema

  debug('request')(
    `json source: %s (exists: %s)`,
    presetDefs?.source,
    (!!presetDefs?.schema).toString()
  )

  const jsonEnabled =
    entities.settings.jsonEnabled === true ||
    entities.settings.jsonEnabled === 'standard' ||
    entities.settings.jsonEnabled === 'separate'
  const schemaEnabled = opts.kind === 'chat-query' || jsonEnabled
  const includeResponse =
    opts.kind !== 'chat-query' &&
    (entities.settings.jsonEnabled === 'standard' || entities.settings.jsonEnabled === true)

  const schema =
    realDefs && schemaEnabled
      ? prepareJsonSchema(
          realDefs,
          {
            char: props.replyAs.name,
            impersonate: props.impersonate?.name,
            sender: entities.profile.handle,
          },
          includeResponse
        )
      : undefined

  const promptOpts: PromptOpts = {
    kind: opts.kind,
    sender: entities.profile,

    // Relevant characters
    char: entities.char,
    replyAs: props.replyAs,
    impersonate: props.impersonate,

    chat: entities.chat,
    user: entities.user,
    members: entities.members.concat([entities.profile]),
    continue: props?.continue,
    books: entities.books,
    retry: props?.retry,
    settings: entities.settings,
    messages: props.messages,
    characters: entities.characters,
    lastMessage: entities.lastMessage?.date || '',
    trimSentences: ui.trimSentences,
    chatEmbeds,
    userEmbeds,
    resolvedScenario,
    jsonValues: props.json,
    contextBuffer: entities.settings.maxTokens,
    props: entities.props,
    schema: schema?.schema,
  }

  const lines = await getPromptHistory(promptOpts, encoder)

  const retrievalAllowed =
    opts.kind === 'request' ||
    opts.kind === 'self' ||
    opts.kind === 'continue' ||
    opts.kind === 'send' ||
    opts.kind === 'retry' ||
    opts.kind === 'chat-query'

  if (retrievalAllowed) {
    const { users, chats } = await getSemanticRetrievalContent(
      text,
      entities,
      props.messages,
      lines.slice()
    )

    if (chats?.messages.length) {
      for (const chat of chats.messages) {
        const name =
          entities.chatBots.find((b) => b._id === chat.entityId)?.name ||
          entities.members.find((m) => m._id === chat.entityId)?.handle ||
          'You'

        chatEmbeds.push({ date: '', distance: chat.similarity, text: chat.msg, name, id: '' })
      }
    }

    if (users?.messages.length) {
      for (const chat of users.messages) {
        userEmbeds.push({ date: '', distance: chat.similarity, text: chat.msg, id: '' })
      }
    }
  }

  const prompt = await createPromptParts(promptOpts, encoder)

  if (entities.settings.modelFormat) {
    prompt.template.parsed = replaceTags(prompt.template.parsed, entities.settings.modelFormat)
  }

  // const embedLines = (prompt.template.history || prompt.lines).slice()

  // if (opts.kind === 'chat-query') {
  //   const assistant = opts.assistant || 'Chat Query'

  //   prompt.lines.push({
  //     msg: `${assistant}: ${opts.text}`,
  //     role: 'user',
  //     _id: '',
  //     json: {},
  //   })
  // }

  return { prompt, props, entities, chatEmbeds, userEmbeds, template, schema }
}

async function getSemanticRetrievalContent(
  text: string | undefined,
  ents: PromptEntities,
  messages: AppSchema.ChatMessage[],
  lines: HistoryLine[]
) {
  const { settings, chat } = ents
  if (!text?.trim()) return { users: undefined, chats: undefined }

  const encoder = await getEncoder()
  let removed = 0
  let count = 0

  let contextLength =
    +localStorage.test_embed > 0 ? localStorage.test_embed : settings.maxContextLength!
  for (let i = 0; i < lines.length; i++) {
    const line = lines[lines.length - 1 - i]
    const size = await encoder(line.msg)
    removed += size
    count++

    if (removed > contextLength) break
  }

  const users = text && chat.userEmbedId ? await embedApi.query(chat.userEmbedId, text) : undefined

  const bp = messages[messages.length - count - 1]
  if (!bp) return { users, chats: undefined }

  const embedLimit = settings.memoryChatEmbedLimit ?? 500
  const chats = embedLimit
    ? await embedApi.queryChat(
        chat._id,
        text,
        bp.createdAt,
        messages.map((m) => m._id)
      )
    : undefined
  return { users, chats }
}

export type GenerateProps = {
  retry?: AppSchema.ChatMessage
  continuing?: AppSchema.ChatMessage
  replacing?: AppSchema.ChatMessage
  entities: PromptEntities
  replyAs: AppSchema.Character
  lastMessage?: NonNullable<PromptEntities['lastMessage']>
  messages: AppSchema.ChatMessage[]
  continue?: string
  impersonate?: AppSchema.Character
  parent?: AppSchema.ChatMessage
  json: Record<string, any>
  reschemaPrompt?: string
}

async function getGenerateProps(opts: GenerateOpts, active: ChatDetail) {
  const entities = await getPromptEntities('messageId' in opts ? { messageId: opts.messageId } : {})

  const json = entities.messages.reduce<Record<string, any>>(
    (prev, curr) => Object.assign(prev, curr.json?.values || {}),
    {}
  )

  const temporary = getServiceTempConfig(entities.settings.service)
  if (!entities.settings.temporary) {
    entities.settings.temporary = {}
  }

  for (const temp of temporary) {
    entities.settings.temporary[temp.field] = temp.value
  }

  const [secondLastMsg, lastMsg] = entities.messages.slice(-2)
  const lastCharMsg = entities.messages.reduceRight<AppSchema.ChatMessage | void>((prev, curr) => {
    if (prev) return prev
    if (curr.characterId) return curr
  }, undefined)

  const props: GenerateProps = {
    entities,
    replyAs: entities.char,
    messages: entities.messages.slice(),
    impersonate: entities.impersonating,
    parent: getMessageParent(opts.kind, entities.messages),
    json,
  }

  if (opts.kind === 'chat-query' && entities.presets.json) {
    entities.settings = entities.presets.json
  }

  if (opts.kind === 'summary' && entities.presets.summary) {
    entities.settings = entities.presets.summary
  }

  if ('text' in opts) {
    const parsed = await parseTemplate(opts.text, {
      char: active.char,
      characters: entities.characters,
      chat: active.chat,
      replyAs: props.replyAs,
      sender: entities.profile,
      impersonate: props.impersonate,
      repeatable: true,
      lastMessage: entities.lastMessage?.date,
      jsonValues: props.json,
    })
    opts.text = parsed.parsed
  }

  const getBot = (id: string) => {
    if (!isLoggedIn() && !id.startsWith('temp-')) {
      const { characters } = getStore('character').getState()
      const char = characters.list.find((ch) => ch._id === id)
      if (char) return char
    }

    if (id.startsWith('temp-')) return entities.chat.tempCharacters?.[id]!

    const { chatChars } = getStore('character').getState()
    const fullChar = chatChars.map[id]
    if (fullChar) return fullChar

    debug('props')('full-char not found: %s', id.slice(0, 4))
    return entities.chatBots.find((ch) => ch._id === id)!
  }

  switch (opts.kind) {
    case 'retry': {
      props.impersonate = entities.impersonating
      props.reschemaPrompt = opts.reschema_prompt

      if (opts.messageId) {
        // Case: When regenerating a response that isn't last. Typically when image messages follow the last text message
        const index = entities.messages.findIndex((msg) => msg._id === opts.messageId)
        const replacing = entities.messages[index]

        // Retrying an impersonated message - We'll use the "auto-reply as" or the "main character"
        if (replacing?.userId) {
          props.replyAs = getBot(active.replyAs || active.char._id)
          props.messages = entities.messages
        } else {
          props.replyAs = getBot(replacing.characterId || active.char._id)
          props.replacing = replacing
          props.messages = entities.messages.slice(0, index)
          const replaceParent = entities.messages[index - 1]
          props.parent = replaceParent
        }
      } else if (!lastMsg && secondLastMsg.characterId) {
        // Case: Replacing the first message (i.e. the greeting)
        props.replyAs = getBot(active.replyAs || active.char._id)
        props.replacing = secondLastMsg
      } else if (lastMsg?.characterId && !lastMsg.userId) {
        // Case: When the user clicked on their own message. Probably after deleting a bot response
        props.retry = secondLastMsg
        props.replacing = lastMsg
        props.replyAs = getBot(lastMsg.characterId)
        props.messages = entities.messages.slice(0, -1)
      } else {
        // Case: Clicked on a bot response to regenerate
        props.retry = lastMsg
        props.replyAs = getBot(active.replyAs || active.char._id)
      }

      break
    }

    case 'continue': {
      if (!lastCharMsg?.characterId) throw new Error(`Cannot continue user message`)
      props.continuing = lastMsg
      props.replyAs = getBot(lastCharMsg?.characterId)
      props.continue = lastCharMsg.msg
      if (opts.retry) {
        const msgState = getStore('messages').getState()
        props.continuing = { ...lastMsg, msg: msgState.textBeforeGenMore ?? lastMsg.msg }
        props.continue = msgState.textBeforeGenMore ?? lastMsg.msg
        props.messages = [
          ...props.messages.slice(0, props.messages.length - 1),
          { ...lastMsg, msg: msgState.textBeforeGenMore ?? lastMsg.msg },
        ]
      }
      break
    }

    case 'send':
    case 'send-event:world':
    case 'send-event:character':
    case 'send-event:hidden': {
      // If the chat is a single-user chat, it is always in 'auto-reply' mode
      // Ensure the autoReplyAs parameter is set for single-bot chats
      const isMulti = getActiveBots(entities.chat, entities.characters).length > 1
      if (!isMulti) entities.autoReplyAs = entities.char._id

      if (!entities.autoReplyAs) throw new Error(`No character selected to reply with`)
      props.impersonate = entities.impersonating
      props.replyAs = getBot(entities.autoReplyAs)
      // props.messages.push(
      //   emptyMsg(entities.chat, {
      //     msg: opts.text,
      //     userId: entities.user._id,
      //     characterId: entities.impersonating?._id,
      //   })
      // )
      break
    }

    case 'summary': {
      break
    }

    case 'request': {
      props.replyAs = getBot(opts.characterId)
      break
    }

    case 'self': {
      if (!entities.impersonating) break
      // We need to switch the user/assistant roles around for the main character and the user
      const assistantId = entities.impersonating._id // To be viewed as: reply as, main character
      // const userId = entities.char._id // To be viewed as: impersonating

      props.replyAs = getBot(assistantId)
      entities.autoReplyAs = assistantId
      props.impersonate = getBot(assistantId)
      entities.impersonating = getBot(assistantId)
      break
    }
  }

  if (!props.replyAs) throw new Error(`Could not find character to reply as`)

  // Remove avatar from generate requests
  entities.char = { ...entities.char, avatar: undefined }
  props.replyAs = { ...props.replyAs, avatar: undefined }

  return props
}

function getMessageParent(
  kind: GenerateOpts['kind'],
  messages: AppSchema.ChatMessage[]
): AppSchema.ChatMessage | undefined {
  const i = messages.length

  switch (kind) {
    case 'retry': {
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]
        if (!msg.userId) continue
        return msg
      }
    }

    case 'send-noreply':
    case 'send-event:ooc':
    case 'send-event:character':
    case 'send-event:hidden':
    case 'send-event:world':
    case 'send':
    case 'request':
    case 'self':
    case 'ooc': {
      return messages[i - 1]
    }

    case 'continue': {
      return
    }
  }
}

function removeAvatar<T extends AppSchema.Character | AppSchema.Profile | undefined>(char?: T): T {
  if (!char) return undefined as T
  return { ...char, avatar: undefined }
}

function removeAvatars(chars: Record<string, AppSchema.Character>) {
  const next: Record<string, AppSchema.Character> = {}

  for (const id in chars) {
    next[id] = { ...chars[id], avatar: undefined }
  }

  return next
}

function waiting(next: ResponseState['waiting']) {
  events.emit(EVENTS.setWaiting, next)

  if (next) {
    console.log(`${EVENTS.setWaiting}: ${inline(next)}`)
  }
}
