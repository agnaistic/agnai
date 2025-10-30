import { v4 } from 'uuid'
import { isLoggedIn } from '../api'
import { getStore } from '../create'
import { localApi } from './storage'
import {
  buildPromptPlaceholders,
  createPromptParts,
  getLinesForPrompt,
  getTemplate,
  JsonField,
  PromptLine,
  resolveScenario,
  TickHandler,
} from '/common/prompt'
import { parseTemplate } from '/common/template-parser'
import { countTokens, getEncoder } from '/common/tokenize'
import { AppSchema } from '/common/types'
import { UserEmbed } from '/common/types/memory'
import { GenerateRequestV2 } from '/srv/adapter/type'
import { GenerateEntities, getPromptEntities, PromptEntities } from './common'
import { embedApi } from '../embeddings'
import { ChatDetail } from '../chat'
import { BUILTIN_FORMATS, replaceTags } from '/common/presets/templates'
import { getServiceTempConfig } from '/web/shared/adapter'
import { getActiveBots } from '/web/pages/Chat/util'
import iconv from 'iconv-lite'
import { genApi } from './inference'
import { localEmit } from '../socket'
import { getProviderConnection } from '/common/providers'
import { toChatMessages } from '/common/template-messages'
import { msgsApi } from './messages'
import { getProvider } from '../preset-context'
import { getLocalPayload, getStoppingStrings } from '/common/requests/payloads'
import { sanitiseAndTrim } from '/common/requests/util'
import { toastStore } from '../toasts'
import { lazyPromise } from '/common/util'
import type { ResponseState } from '../response'
import { EVENTS, events } from '/web/emitter'

iconv.enableStreamingAPI(require('stream'))

export const botGen = {
  stream: streamResponse,
  getActivePromptOptions,
  getMessageParent,
}

export type GenerateOpts = { signal: AbortController; hint?: string } & /**
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
  | { kind: 'summary' }
  | { kind: 'chat-query'; text: string; schema?: JsonField[] }
)

type ChatRequest = Awaited<ReturnType<typeof buildChatRequest>>
type StreamOpts = Exclude<GenerateOpts, { type: 'ooc' | 'send-noreply' | 'send-event:ooc' }>

async function streamResponse(opts: StreamOpts, onTick?: TickHandler) {
  const { details, lastChatId } = getStore('chat').getState()
  const active = details[lastChatId]
  if (!active) {
    return localApi.error('No active chat. Try refreshing.')
  }

  const req = await buildChatRequest(opts)
  const { messages, assembled } = await toChatMessages(req.request, countTokens)

  if (assembled.sections.warnings.noHistory) {
    return localApi.error(
      `Your prompt template does not contain the 'chat history' placeholder. Please fix your prompt template.`
    )
  }

  if (assembled.linesAddedCount === 0 && req.props.messages.length) {
    return localApi.error(
      `Could not fit any messages in prompt. Check your character definition, context size, and template`
    )
  }

  const lazy = lazyPromise()

  await handlePreStreamResponse(opts, req)

  const meta: any = {
    ctx: req.entities.settings.maxContextLength,
    len: req.prompt.template.length,
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
  const santitize = (text: string) =>
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

  localEmit({ type: 'service-prompt', id: messageId, prompt: JSON.stringify(messages, null, 2) })

  await genApi.inferenceStream(
    {
      settings: req.request.settings,
      jsonSchema: req.request.jsonSchema,
      messages: messages,
      prompt: assembled.prompt,
      payload,
      signal: opts.signal,
      stop: stops,
      chatId: req.request.chat._id,
      // TODO: Re-enable multiplayer streaming
      // broadcast: {
      //   type: 'chat',
      //   id: active.chat._id,
      //   payload: {
      //     messageId: out.request.requestId,
      //     characterId: out.request.replyAs._id,
      //     chatId: active.chat._id,
      //   },
      // },
    },
    async (response, state, json) => {
      switch (state) {
        case 'error':
          lazy.reject(response)
          toastStore.error(response)
          waiting(undefined)
          break

        case 'meta':
          Object.assign(meta, json)
          break

        case 'headers': {
          lazy.resolve({
            generating: true,
            input: opts.kind === 'send' ? opts.text : undefined,
            requestId: req.request.requestId,
          })
          break
        }

        case 'partial': {
          const trimmed = santitize(prefix + response)
          if (req.request.settings?.streamResponse) {
            localEmit({
              type: 'message-partial',
              chatId: active.chat._id,
              partial: trimmed,
              partialId: req.request.requestId,
            })
          }
          break
        }

        case 'done': {
          const trimmed = santitize(prefix + response)
          await handlePostStreamResponse(opts, req, trimmed, meta)
          waiting(undefined)
          break
        }
      }

      onTick?.(response, state, json)
    }
  )

  return lazy.promise
}

async function handlePreStreamResponse(opts: StreamOpts, req: ChatRequest) {
  if (opts.kind !== 'ooc' && opts.kind !== 'send') return
  if (opts.messageId) return { messageId: opts.messageId }
}

async function handlePostStreamResponse(
  opts: StreamOpts,
  req: ChatRequest,
  response: string,
  meta: any
) {
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
        retries,
        state: 'retried',
        meta,
      }

      await msgsApi.editMessageProps(replacing, payload)
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
      })
      return
    }

    case 'chat-query':
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
      break
    }
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
  })

  getStore('responses').setState({
    waiting: undefined,
    retrying: undefined,
    partial: undefined,
    partialId: undefined,
  })
}

async function buildChatRequest(opts: GenerateOpts) {
  const activePrompt = await createActiveChatPrompt(opts).catch((err) => ({ err }))
  if ('err' in activePrompt) {
    console.error(activePrompt.err)
    throw new Error(activePrompt.err.message || activePrompt.err)
  }

  const { prompt, props, entities, chatEmbeds, userEmbeds } = activePrompt

  const jsonSchema = opts.kind === 'chat-query' ? opts.schema : undefined
  const request: GenerateRequestV2 = {
    requestId: v4(),
    kind: opts.kind,
    chat: entities.chat,
    user: entities.user,
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
    lastMessage: entities.lastMessage?.date,
    jsonSchema,
    chatEmbeds,
    userEmbeds,
    jsonValues: props.json,
    reschemaPrompt: props.reschemaPrompt,
    eventStream: true,
  }

  const stops = getStoppingStrings(request, request.settings)
  request.settings!.stopSequences = stops

  if (
    opts.kind === 'send' ||
    opts.kind === 'request' ||
    opts.kind === 'continue' ||
    opts.kind === 'retry' ||
    opts.kind === 'self' ||
    opts.kind === 'chat-query'
  ) {
    request.attachments = entities.attachments
  }

  return { request, prompt, entities, activePrompt, props }
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
    book: entities.book,
    continue: props.continue,
    impersonate: entities.impersonating,
    chatEmbeds: [],
    settings: entities.settings,
    messages: entities.messages,
    lastMessage: entities.lastMessage?.date || '',
    resolvedScenario,
    jsonValues: props.json,
  }

  const { lines } = await getLinesForPrompt(promptOpts, encoder)
  const parts = await buildPromptPlaceholders(promptOpts, lines, encoder)

  parts.props = {
    hint: promptState.hintsEnabled ? promptState.hint : '',
  }

  return { lines, parts, entities, props }
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
  const { templates } = getStore('presets').getState()

  if (!active) {
    throw new Error('No active chat. Try refreshing')
  }

  const props = await getGenerateProps(opts, active)
  const entities = props.entities
  const template = getTemplate({ settings: entities.settings, chat: entities.chat }, templates)

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
  const prompt = await createPromptParts(
    {
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
      book: entities.book,
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
    },
    encoder
  )

  if (entities.settings.modelFormat) {
    prompt.template.parsed = replaceTags(prompt.template.parsed, entities.settings.modelFormat)
  }

  const embedLines = (prompt.template.history || prompt.lines).slice()

  const { users, chats } = await getRetrievalBreakpoint(text, entities, props.messages, embedLines)

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

  if (opts.kind === 'chat-query') {
    prompt.lines.push({ msg: `Chat Query: ${opts.text}`, role: 'user', _id: '' })
  }

  return { prompt, props, entities, chatEmbeds, userEmbeds, template }
}

async function getRetrievalBreakpoint(
  text: string | undefined,
  ents: PromptEntities,
  messages: AppSchema.ChatMessage[],
  lines: PromptLine[]
) {
  const { settings, chat } = ents
  if (!text?.trim()) return { users: undefined, chats: undefined }

  const encoder = await getEncoder()
  let removed = 0
  let count = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[lines.length - 1 - i]
    const size = await encoder(line.line)
    removed += size
    count++

    if (removed > settings.maxContextLength!) break
  }

  const users = text && chat.userEmbedId ? await embedApi.query(chat.userEmbedId, text) : undefined

  const bp = messages[messages.length - count - 1]
  if (!bp) return { users, chats: undefined }

  const chats = settings.memoryChatEmbedLimit
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
  lastMessage?: AppSchema.ChatMessage
  entities: GenerateEntities
  replyAs: AppSchema.Character
  messages: AppSchema.ChatMessage[]
  continue?: string
  impersonate?: AppSchema.Character
  parent?: AppSchema.ChatMessage
  json: Record<string, any>
  reschemaPrompt?: string
}

async function getGenerateProps(opts: GenerateOpts, active: ChatDetail): Promise<GenerateProps> {
  const entities = await getPromptEntities()

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
}
