import { v4 } from 'uuid'
import { api } from '../api'
import { getStore } from '../create'
import { genApi } from './inference'
import { localApi } from './storage'
import {
  buildPromptParts,
  createPromptParts,
  getLinesForPrompt,
  InferenceState,
  JsonField,
  resolveScenario,
} from '/common/prompt'
import { handleLocalRequest } from '/common/requests'
import { parseTemplate } from '/common/template-parser'
import { getEncoder } from '/common/tokenize'
import { AppSchema } from '/common/types'
import { UserEmbed } from '/common/types/memory'
import { GenerateRequestV2 } from '/srv/adapter/type'
import { GenerateEntities, getPromptEntities, PromptEntities } from './common'
import { embedApi } from '../embeddings'
import { ChatState } from '../chat'
import { replaceTags } from '/common/presets/templates'
import { getServiceTempConfig } from '/web/shared/adapter'
import { getActiveBots } from '/web/pages/Chat/util'
import iconv from 'iconv-lite'

iconv.enableStreamingAPI(require('stream'))

export const botGen = {
  generate: generateResponse,
  getActivePromptOptions,
}

export type GenerateOpts =
  /**
   * A user sending a new message
   */
  | { kind: 'send'; text: string }
  | { kind: EventKind; text: string }
  | { kind: 'send-noreply'; text: string }
  | { kind: 'ooc'; text: string }
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

export async function generateResponse(
  opts: GenerateOpts,
  onTick?: (msg: string, state: InferenceState) => any
) {
  const { active } = getStore('chat').getState()

  if (!active) {
    return localApi.error('No active chat. Try refreshing.')
  }

  if (
    opts.kind === 'ooc' ||
    opts.kind === 'send-noreply' ||
    opts.kind === 'send-event:ooc' ||
    // allow events to be sent without a reply in multi-bot chats
    (isEventOpts(opts) && !active.replyAs)
  ) {
    return createMessage(active.chat._id, opts)
  }

  const activePrompt = await createActiveChatPrompt(opts).catch((err) => ({ err }))
  if ('err' in activePrompt) {
    console.error(activePrompt.err)
    return localApi.error(activePrompt.err.message || activePrompt.err)
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
    lines: prompt.lines,
    linesCount: props.messages.length,
    settings: entities.settings,
    replacing: props.replacing,
    continuing: props.continuing,
    replyAs: removeAvatar(
      opts.kind === 'self' && props.impersonate ? props.impersonate : props.replyAs
    ),
    impersonate: removeAvatar(props.impersonate),
    characters: removeAvatars(entities.characters),
    parent: props.parent?._id,
    lastMessage: entities.lastMessage?.date,
    jsonSchema,
    chatEmbeds,
    userEmbeds,
    jsonValues: props.json,
    reschemaPrompt: props.reschemaPrompt,
  }

  if (
    opts.kind === 'send' ||
    opts.kind === 'request' ||
    opts.kind === 'continue' ||
    opts.kind === 'retry' ||
    opts.kind === 'self' ||
    opts.kind === 'chat-query'
  ) {
    request.imageData = entities.imageData
  }

  if (useLocalRequest(entities.settings, entities.user._id)) {
    localRequest(request, prompt.template.parsed).then(() => {
      console.log('[done]')
    })

    const input = opts.kind === 'send' ? opts.text : undefined
    return localApi.result({ generating: true, input, requestId: request.requestId })
  }

  const res = await api.post<{ requestId: string; messageId?: string }>(
    `/chat/${entities.chat._id}/generate`,
    request
  )

  if (res.result && onTick) {
    genApi.callbacks.set(request.requestId, onTick)
  }

  return res
}

async function localRequest(request: GenerateRequestV2, prompt: string) {
  const res = await handleLocalRequest(request, prompt)
  if (res.result) {
    request.response = res.result.response
  }

  await api.post<{ requestId: string; messageId?: string }>(
    `/chat/${request.chat._id}/generate`,
    request
  )
}

async function getActivePromptOptions(
  opts: Exclude<GenerateOpts, { kind: 'ooc' | 'send-noreply' }>
) {
  const { active } = getStore('chat').getState()

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

  const lines = await getLinesForPrompt(promptOpts, encoder)
  const parts = await buildPromptParts(promptOpts, lines, encoder)

  return { lines, parts, entities, props }
}

type EventKind =
  | 'send-event:world'
  | 'send-event:character'
  | 'send-event:hidden'
  | 'send-event:ooc'

function isEventOpts(opts: GenerateOpts): opts is { kind: EventKind; text: string } {
  return (
    opts.kind.startsWith('send-event:') &&
    ['world', 'character', 'hidden', 'ooc'].includes(opts.kind.split(':')[1])
  )
}

async function createActiveChatPrompt(
  opts: Exclude<GenerateOpts, { kind: 'ooc' | 'send-noreply' | 'send-event:ooc' }>
) {
  const { active } = getStore('chat').getState()
  const { ui } = getStore('user').getState()

  if (!active) {
    throw new Error('No active chat. Try refreshing')
  }

  const props = await getGenerateProps(opts, active)
  const entities = props.entities

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
      char: entities.char,
      sender: entities.profile,
      chat: entities.chat,
      user: entities.user,
      members: entities.members.concat([entities.profile]),
      continue: props?.continue,
      book: entities.book,
      retry: props?.retry,
      settings: entities.settings,
      messages: props.messages,
      replyAs: props.replyAs,
      characters: entities.characters,
      impersonate: props.impersonate,
      lastMessage: entities.lastMessage?.date || '',
      trimSentences: ui.trimSentences,
      chatEmbeds,
      userEmbeds,
      resolvedScenario,
      jsonValues: props.json,
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
    prompt.lines.push(`Chat Query: ${opts.text}`)
  }

  return { prompt, props, entities, chatEmbeds, userEmbeds }
}

async function getRetrievalBreakpoint(
  text: string | undefined,
  { settings, chat }: PromptEntities,
  messages: AppSchema.ChatMessage[],
  lines: string[]
) {
  if (!text) return { users: undefined, chats: undefined }

  const encoder = await getEncoder()
  let removed = 0
  let count = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[lines.length - 1 - i]
    const size = await encoder(line)
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

async function getGenerateProps(
  opts: Exclude<GenerateOpts, { kind: 'ooc' } | { kind: 'send-noreply' }>,
  active: NonNullable<ChatState['active']>
): Promise<GenerateProps> {
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
      props.messages.push(
        emptyMsg(entities.chat, {
          msg: opts.text,
          userId: entities.user._id,
          characterId: entities.impersonating?._id,
        })
      )
      break
    }

    case 'summary': {
      break
    }

    case 'request': {
      props.replyAs = getBot(opts.characterId)
    }
  }

  if (!props.replyAs) throw new Error(`Could not find character to reply as`)

  // Remove avatar from generate requests
  entities.char = { ...entities.char, avatar: undefined }
  props.replyAs = { ...props.replyAs, avatar: undefined }

  return props
}

/**
 * Create a user message that does not generate a bot response
 */
async function createMessage(
  chatId: string,
  opts: {
    kind: 'ooc' | 'send-noreply' | EventKind
    text: string
  }
) {
  const props = await getPromptEntities()
  const { impersonating } = getStore('character').getState()
  const impersonate = opts.kind === 'send-noreply' ? impersonating : undefined

  const text = await parseTemplate(opts.text, {
    char: props.char,
    chat: props.chat,
    sender: props.profile,
    impersonate: impersonating,
    replyAs: props.char,
    lastMessage: props.lastMessage?.date,
    jsonValues: props.messages.reduce(
      (prev, curr) => Object.assign(prev, curr.json?.values || {}),
      {}
    ),
  })

  return api.post<{ requestId: string }>(`/chat/${chatId}/send`, {
    text: text.parsed,
    kind: opts.kind,
    impersonate: impersonate,
    parent: getMessageParent(opts.kind, props.messages)?._id,
  })
}

function emptyMsg(
  chat: AppSchema.Chat,
  props: Partial<AppSchema.ChatMessage>
): AppSchema.ChatMessage {
  return {
    _id: '',
    kind: 'chat-message',
    chatId: chat._id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    msg: '',
    retries: [],
    ...props,
  }
}

function useLocalRequest(settings: Partial<AppSchema.UserGenPreset>, userId: string) {
  if (!settings.localRequests) return false
  if (settings.service !== 'kobold') return false

  const format = settings.thirdPartyFormat
  if (format !== 'openai' && format !== 'openai-chat') {
    return false
  }

  if (settings.localRequests && settings.userId !== userId) {
    throw new Error(
      `Multiplayer not available for this chat: Chat is configured for local requests`
    )
  }

  return true
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
