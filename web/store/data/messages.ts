import { v4 } from 'uuid'
import {
  createPrompt,
  getChatPreset,
  getLinesForPrompt,
  getPromptParts,
} from '../../../common/prompt'
import { getEncoder } from '../../../common/tokenize'
import { GenerateRequestV2 } from '../../../srv/adapter/type'
import { AppSchema } from '../../../common/types/schema'
import { api, isLoggedIn } from '../api'
import { ChatState, chatStore } from '../chat'
import { getStore } from '../create'
import { userStore } from '../user'
import { loadItem, localApi } from './storage'
import { toastStore } from '../toasts'
import { subscribe } from '../socket'
import { getActiveBots, getBotsForChat } from '/web/pages/Chat/util'
import { pipelineApi } from './pipeline'
import { UserEmbed } from '/common/types/memory'
import { settingStore } from '../settings'
import { TemplateOpts, parseTemplate } from '/common/template-parser'
import { replace } from '/common/util'
import { toMap } from '/web/shared/util'

export type PromptEntities = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  user: AppSchema.User
  profile: AppSchema.Profile
  book?: AppSchema.MemoryBook
  messages: AppSchema.ChatMessage[]
  settings: Partial<AppSchema.GenSettings>
  members: AppSchema.Profile[]
  chatBots: AppSchema.Character[]
  autoReplyAs?: string
  characters: Record<string, AppSchema.Character>
  impersonating?: AppSchema.Character
  lastMessage?: { msg: string; date: string }
  scenarios?: AppSchema.ScenarioBook[]
}

export const msgsApi = {
  editMessage,
  editMessageProps,
  getMessages,
  getPromptEntities,
  generateResponseV2,
  deleteMessages,
  basicInference,
  createActiveChatPrompt,
  guidance,
  guidanceAsync,
  rerunGuidance,
  generateActions,
  getActiveTemplateParts,
}

type InferenceOpts = {
  prompt: string
  settings?: Partial<AppSchema.GenSettings>
  service?: string
  maxTokens?: number
}

export async function generateActions() {
  const { settings, impersonating, profile, user, messages } = await getPromptEntities()
  const { prompt } = await createActiveChatPrompt({ kind: 'continue' }, 1024)

  const last = messages.slice(-1)[0]

  if (!last) {
    toastStore.warn('Cannot generate actions: No messages')
    return
  }

  await api.post<{ actions: AppSchema.ChatAction[] }>(`/chat/${last._id}/actions`, {
    service: settings.service,
    settings,
    impersonating,
    profile,
    user,
    lines: prompt.lines,
  })
}

export async function basicInference(
  { prompt, settings }: InferenceOpts,
  onComplete: (err?: any, response?: string) => void
) {
  const requestId = v4()
  const { user } = userStore.getState()

  if (!user) {
    toastStore.error(`Could not get user settings. Refresh and try again.`)
    return
  }

  subscribe(
    'inference-complete',
    { requestId: 'string', response: 'string?', error: 'string?' },
    (body) => onComplete(body.error, body.response),
    (body) => body.requestId === requestId
  )

  const res = await api.method('post', `/chat/inference`, { requestId, user, prompt, settings })
  if (res.error) {
    onComplete(res.error)
    return
  }
}

export async function guidance<T = any>(
  { prompt, service, maxTokens }: InferenceOpts,
  onComplete?: (err: any | null, response?: { result: string; values: T }) => void
): Promise<void> {
  const requestId = v4()
  const { user } = userStore.getState()

  if (!user) {
    toastStore.error(`Could not get user settings. Refresh and try again.`)
    return
  }

  const res = await api.method('post', `/chat/guidance`, {
    requestId,
    user,
    prompt,
    service,
    maxTokens,
  })

  if (res.error) {
    onComplete?.(res.error)
    if (!onComplete) {
      throw new Error(`Guidance failed: ${res.error}`)
    }
  }

  onComplete?.(null, res.result)
}

export async function guidanceAsync<T = any>(
  opts: InferenceOpts
): Promise<{ result: string; values: T }> {
  return new Promise((resolve, reject) => {
    guidance<T>(opts, (err, result) => {
      if (err) return reject(err)
      if (result) resolve(result)
    })
  })
}

export async function rerunGuidance<T = any>(
  {
    prompt,
    service,
    maxTokens,
    rerun,
    previous,
  }: InferenceOpts & { previous?: any; rerun: string[] },
  onComplete?: (err: any | null, response?: { result: string; values: T }) => void
) {
  const requestId = v4()
  const { user } = userStore.getState()

  if (!user) {
    toastStore.error(`Could not get user settings. Refresh and try again.`)
    return
  }

  const res = await api.method('post', `/chat/reguidance`, {
    requestId,
    user,
    prompt,
    service,
    maxTokens,
    rerun,
    previous,
  })
  if (res.error) {
    onComplete?.(res.error)
    if (!onComplete) {
      throw new Error(`Guidance failed: ${res.error}`)
    }
  }

  if (res.result) {
    onComplete?.(null, res.result)
    return res.result
  }
}

export async function editMessage(msg: AppSchema.ChatMessage, replace: string) {
  return editMessageProps(msg, { msg: replace })
}

export async function editMessageProps(
  msg: AppSchema.ChatMessage,
  update: Partial<AppSchema.ChatMessage>
) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/chat/${msg._id}/message-props`, update)
    return res
  }

  const messages = await localApi.getMessages(msg.chatId)
  const next = replace(msg._id, messages, update)
  await localApi.saveMessages(msg.chatId, next)
  return localApi.result({ success: true })
}

export async function getMessages(chatId: string, before: string) {
  // Guest users already have their entire chat history
  if (!isLoggedIn()) return localApi.result({ messages: [] })

  const res = await api.get<{ messages: AppSchema.ChatMessage[] }>(`/chat/${chatId}/messages`, {
    before,
  })
  return res
}

export type GenerateOpts =
  /**
   * A user sending a new message
   */
  | { kind: 'send'; text: string }
  | { kind: 'send-event:world'; text: string }
  | { kind: 'send-event:character'; text: string }
  | { kind: 'send-event:hidden'; text: string }
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
  | { kind: 'retry'; messageId?: string }
  /**
   * The last message in the chat is a bot message and we want to generate more text for this message.
   */
  | { kind: 'continue' }
  /**
   * Generate a message on behalf of the user
   */
  | { kind: 'self' }
  | { kind: 'summary' }

export async function generateResponseV2(opts: GenerateOpts) {
  const { ui } = userStore.getState()
  const { active } = chatStore.getState()

  if (!active) {
    return localApi.error('No active chat. Try refreshing.')
  }

  if (opts.kind === 'ooc' || opts.kind === 'send-noreply') {
    return createMessage(active.chat._id, opts)
  }

  const activePrompt = await createActiveChatPrompt(opts).catch((err) => ({ err }))
  if ('err' in activePrompt) {
    return localApi.error(activePrompt.err.message || activePrompt.err)
  }

  const { prompt, props, entities, chatEmbeds, userEmbeds } = activePrompt

  const embedWarnings: string[] = []
  if (chatEmbeds.length > 0 && prompt.parts.chatEmbeds.length === 0) embedWarnings.push('Chat')
  if (userEmbeds.length > 0 && prompt.parts.userEmbeds.length === 0)
    embedWarnings.push('User-created')

  if (embedWarnings.length) {
    toastStore.warn(
      `Embedding from ${embedWarnings.join(
        ' and '
      )} did not fit in prompt. Check your Preset -> Memory Embed context limits.`
    )
  }

  if (ui?.logPromptsToBrowserConsole) {
    console.log(`=== Sending the following prompt: ===`)
    console.log(`${prompt.template}`)
  }

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
      opts.kind === 'send' ||
      opts.kind === 'send-event:world' ||
      opts.kind === 'send-event:character' ||
      opts.kind === 'send-event:hidden'
        ? opts.text
        : undefined,
    lines: prompt.lines,
    settings: entities.settings,
    replacing: props.replacing,
    continuing: props.continuing,
    replyAs: removeAvatar(props.replyAs),
    impersonate: removeAvatar(props.impersonate),
    characters: removeAvatars(entities.characters),
    lastMessage: entities.lastMessage?.date,
    chatEmbeds,
    userEmbeds,
  }

  const res = await api.post<{ requestId: string }>(`/chat/${entities.chat._id}/generate`, request)
  return res
}

async function getActiveTemplateParts() {
  const { active } = chatStore.getState()

  const { parts, entities } = await getActivePromptOptions({ kind: 'summary' })
  const toLine = messageToLine({
    chars: entities.characters,
    members: entities.members,
    sender: entities.profile,
    impersonate: entities.impersonating,
  })

  const opts: TemplateOpts = {
    chat: entities.chat,
    replyAs: active?.replyAs ? entities.characters[active.replyAs] : entities.char,
    char: entities.char,
    characters: entities.characters,
    lines: entities.messages.filter((msg) => msg.adapter !== 'image' && !msg.event).map(toLine),
    parts,
    sender: entities.profile,
  }

  return opts
}

async function getActivePromptOptions(
  opts: Exclude<GenerateOpts, { kind: 'ooc' | 'send-noreply' }>
) {
  const { active } = chatStore.getState()

  if (!active) {
    throw new Error('No active chat. Try refreshing')
  }

  const props = await getGenerateProps(opts, active)
  const entities = props.entities

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
  }

  const lines = getLinesForPrompt(promptOpts, encoder)
  const parts = getPromptParts(promptOpts, lines, encoder)

  return { lines, parts, entities, props }
}

async function createActiveChatPrompt(
  opts: Exclude<GenerateOpts, { kind: 'ooc' | 'send-noreply' }>,
  maxContext?: number
) {
  const { active } = chatStore.getState()
  const { ui, user } = userStore.getState()
  const { pipelineOnline } = settingStore.getState()

  if (!active) {
    throw new Error('No active chat. Try refreshing')
  }

  const props = await getGenerateProps(opts, active)
  const entities = props.entities

  const chat = {
    ...entities.chat,
    scenario: resolveScenario(entities.chat.scenario || '', entities.scenarios || []),
  }

  const chatEmbeds: UserEmbed<{ name: string }>[] = []
  const userEmbeds: UserEmbed[] = []

  const text =
    opts.kind === 'send' ||
    opts.kind === 'send-event:world' ||
    opts.kind === 'send-event:character' ||
    opts.kind === 'send-event:hidden'
      ? opts.text
      : entities.lastMessage?.msg

  if (pipelineOnline && user?.useLocalPipeline) {
    const created = text ? new Date().toISOString() : entities.messages.slice(-1)[0]?.createdAt
    const chats = text
      ? await pipelineApi.chatRecall(entities.chat._id, text, created || new Date().toISOString())
      : null

    const users =
      text && entities.chat.userEmbedId
        ? await pipelineApi.queryEmbedding(entities.chat.userEmbedId, text)
        : null

    if (chats) {
      chatEmbeds.push(...chats)
    }

    if (users) {
      userEmbeds.push(...users)
    }
  }

  const encoder = await getEncoder()
  const prompt = createPrompt(
    {
      kind: opts.kind,
      char: entities.char,
      sender: entities.profile,
      chat,
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
    },
    encoder,
    maxContext
  )
  return { prompt, props, entities, chatEmbeds, userEmbeds }
}

type GenerateProps = {
  retry?: AppSchema.ChatMessage
  continuing?: AppSchema.ChatMessage
  replacing?: AppSchema.ChatMessage
  lastMessage?: AppSchema.ChatMessage
  entities: GenerateEntities
  replyAs: AppSchema.Character
  messages: AppSchema.ChatMessage[]
  continue?: string
  impersonate?: AppSchema.Character
}

function resolveScenario(scenario: string, scenarios: AppSchema.ScenarioBook[]) {
  const main = scenarios.find((s) => s.overwriteCharacterScenario)
  if (main) scenario = main.text

  const secondary = scenarios.filter((s) => s.overwriteCharacterScenario === false)
  if (!secondary.length) return scenario

  scenario += '\n' + secondary.map((s) => s.text).join('\n')
  return scenario
}

async function getGenerateProps(
  opts: Exclude<GenerateOpts, { kind: 'ooc' } | { kind: 'send-noreply' }>,
  active: NonNullable<ChatState['active']>
): Promise<GenerateProps> {
  const entities = await getPromptEntities()
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
  }

  if ('text' in opts) {
    opts.text = parseTemplate(opts.text, {
      char: active.char,
      characters: entities.characters,
      chat: active.chat,
      lines: [],
      parts: {} as any,
      replyAs: props.replyAs,
      sender: entities.profile,
      impersonate: props.impersonate,
      repeatable: true,
    })
  }

  const getBot = (id: string) => {
    if (id.startsWith('temp-')) return entities.chat.tempCharacters?.[id]!
    return entities.chatBots.find((ch) => ch._id === id)!
  }

  switch (opts.kind) {
    case 'retry': {
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
      props.messages.push(emptyMsg(entities.chat, { msg: opts.text, userId: entities.user._id }))
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
async function createMessage(chatId: string, opts: { kind: 'ooc' | 'send-noreply'; text: string }) {
  const { impersonating } = getStore('character').getState()
  const impersonate = opts.kind === 'send-noreply' ? impersonating : undefined
  return api.post<{ requestId: string }>(`/chat/${chatId}/send`, {
    text: opts.text,
    kind: opts.kind,
    impersonate,
  })
}

export async function deleteMessages(chatId: string, msgIds: string[]) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/chat/${chatId}/messages`, { ids: msgIds })
    return res
  }

  const msgs = await localApi.getMessages(chatId)
  const ids = new Set(msgIds)
  const next = msgs.filter((msg) => ids.has(msg._id) === false)
  await localApi.saveMessages(chatId, next)

  return localApi.result({ success: true })
}

type GenerateEntities = Awaited<ReturnType<typeof getPromptEntities>>

export async function getPromptEntities(): Promise<PromptEntities> {
  if (isLoggedIn()) {
    const entities = getAuthedPromptEntities()
    if (!entities) throw new Error(`Could not collate data for prompting`)
    return {
      ...entities,
      messages: entities.messages.filter((msg) => msg.ooc !== true),
      lastMessage: getLastMessage(entities.messages),
    }
  }

  const entities = await getGuestEntities()
  if (!entities) throw new Error(`Could not collate data for prompting`)
  return {
    ...entities,
    messages: entities.messages.filter((msg) => msg.ooc !== true),
    lastMessage: getLastMessage(entities.messages),
  }
}

async function getGuestEntities() {
  const { active } = getStore('chat').getState()
  if (!active) return

  const chat = active.chat
  const char = active.char

  if (!chat || !char) return

  const book = chat?.memoryId
    ? await loadItem('memory').then((res) => res.find((mem) => mem._id === chat.memoryId))
    : undefined

  const allScenarios = await loadItem('scenario')
  const profile = await loadItem('profile')
  const messages = await localApi.getMessages(chat?._id)
  const user = await loadItem('config')
  const settings = await getGuestPreset(user, chat)
  const scenarios = allScenarios?.filter(
    (s) => chat.scenarioIds && chat.scenarioIds.includes(s._id)
  )

  const {
    impersonating,
    characters: { list, map },
  } = getStore('character').getState()

  const characters = getBotsForChat(chat, char, map)

  return {
    chat,
    char,
    user,
    profile,
    book,
    messages,
    settings,
    members: [profile] as AppSchema.Profile[],
    chatBots: list,
    autoReplyAs: active.replyAs,
    characters,
    impersonating,
    scenarios,
  }
}

function getAuthedPromptEntities() {
  const { active, chatProfiles: members } = getStore('chat').getState()
  if (!active) return

  const { profile, user } = getStore('user').getState()
  if (!profile || !user) return

  const chat = active.chat
  const char = active.char

  const book = getStore('memory')
    .getState()
    .books.list.find((book) => book._id === chat.memoryId)

  const messages = getStore('messages').getState().msgs
  const settings = getAuthGenSettings(chat, user)!
  const scenarios = getStore('scenario')
    .getState()
    .scenarios.filter((s) => chat.scenarioIds && chat.scenarioIds.includes(s._id))

  const {
    impersonating,
    characters: { list, map },
  } = getStore('character').getState()

  const characters = getBotsForChat(chat, char, map)

  return {
    chat,
    char,
    user,
    profile,
    book,
    messages,
    settings,
    members,
    chatBots: list,
    autoReplyAs: active.replyAs,
    characters,
    impersonating,
    scenarios,
  }
}

function getAuthGenSettings(
  chat: AppSchema.Chat,
  user: AppSchema.User
): Partial<AppSchema.GenSettings> | undefined {
  const presets = getStore('presets').getState().presets
  return getChatPreset(chat, user, presets)
}

async function getGuestPreset(user: AppSchema.User, chat: AppSchema.Chat) {
  // The server does not store presets for users
  // Override the `genSettings` property with the locally stored preset data if found
  const presets = await loadItem('presets')
  return getChatPreset(chat, user, presets)
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
    ...props,
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

/**
 *
 */
function getLastMessage(messages: AppSchema.ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!msg.userId) continue
    return { msg: msg.msg, date: msg.createdAt }
  }
}

function messageToLine(opts: {
  chars: Record<string, AppSchema.Character>
  sender: AppSchema.Profile
  members: AppSchema.Profile[]
  impersonate?: AppSchema.Character
}) {
  const map = toMap(opts.members)
  return (msg: AppSchema.ChatMessage) => {
    const entity =
      (msg.characterId ? opts.chars[msg.characterId]?.name : map[msg.userId!]?.handle) ||
      opts.impersonate?.name ||
      opts.sender.handle ||
      'You'
    return `${entity}: ${msg.msg}`
  }
}
