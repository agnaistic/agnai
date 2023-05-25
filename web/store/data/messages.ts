import { createPrompt, getChatPreset } from '../../../common/prompt'
import { getEncoder } from '../../../common/tokenize'
import { GenerateRequestV2 } from '../../../srv/adapter/type'
import { AppSchema } from '../../../srv/db/schema'
import { api, isLoggedIn } from '../api'
import { ChatState, chatStore } from '../chat'
import { getStore } from '../create'
import { userStore } from '../user'
import { loadItem, localApi } from './storage'

export type PromptEntities = Awaited<ReturnType<typeof getPromptEntities>>

export const msgsApi = {
  editMessage,
  getMessages,
  getPromptEntities,
  generateResponseV2,
  deleteMessages,
}

export async function editMessage(msg: AppSchema.ChatMessage, replace: string) {
  if (isLoggedIn()) {
    const res = await api.method('put', `/chat/${msg._id}/message`, { message: replace })
    return res
  }

  const messages = await localApi.getMessages(msg.chatId)
  const next = localApi.replace(msg._id, messages, { msg: replace })
  localApi.saveMessages(msg.chatId, next)
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
  | { kind: 'retry' }
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
  const { ui } = userStore()
  const { active } = chatStore()

  if (!active) {
    return localApi.error('No active chat. Try refreshing.')
  }

  if (opts.kind === 'ooc' || opts.kind === 'send-noreply') {
    return createMessage(active.chat._id, opts)
  }

  const props = await getGenerateProps(opts, active).catch((err: Error) => err)
  if (props instanceof Error) {
    return localApi.error(props.message)
  }

  const entities = props.entities

  const encoder = await getEncoder()
  const prompt = createPrompt(
    {
      kind: opts.kind,
      char: entities.char,
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
    },
    encoder
  )
  if (ui?.logPromptsToBrowserConsole) {
    console.log(`=== Sending the following prompt: ===`)
    console.log(`${prompt.parts.gaslight}\n${prompt.lines.join('\n')}\n${prompt.post}`)
  }

  const { avatar: _, ...sender } = entities.profile
  const { avatar: __, ...char } = entities.char

  // Prevent sending the avatar due to guests have avatars base64 encoded
  for (const charId in entities.characters) {
    entities.characters[charId] = { ...entities.characters[charId], avatar: '' }
  }

  const request: GenerateRequestV2 = {
    kind: opts.kind,
    chat: entities.chat,
    user: entities.user,
    char,
    sender,
    members: entities.members,
    parts: prompt.parts,
    lines: prompt.lines,
    text: opts.kind === 'send' ? opts.text : undefined,
    settings: entities.settings,
    replacing: props.replacing,
    continuing: props.continuing,
    replyAs: props.replyAs,
    characters: entities.characters,
  }

  const res = await api.post(`/chat/${entities.chat._id}/generate`, request)
  return res
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
}

async function getGenerateProps(
  opts: Exclude<GenerateOpts, { kind: 'ooc' } | { kind: 'send-noreply' }>,
  active: NonNullable<ChatState['active']>
): Promise<GenerateProps> {
  const entities = await getPromptEntities()
  const [message, lastMessage] = entities.messages.slice(-2)

  const props: GenerateProps = {
    entities,
    replyAs: entities.char,
    messages: entities.messages.slice(),
  }

  const getBot = (id: string) => entities.chatBots.find((ch) => ch._id === id)!

  switch (opts.kind) {
    case 'retry': {
      if (!lastMessage) throw new Error(`No message to retry`)
      if (lastMessage.characterId) {
        props.retry = message
        props.replacing = lastMessage
        props.replyAs = getBot(lastMessage.characterId)
        props.messages = entities.messages.slice(0, -1)
      } else {
        props.retry = lastMessage
        props.replyAs = getBot(active.replyAs || active.char._id)
      }

      break
    }

    case 'continue': {
      if (!lastMessage.characterId) throw new Error(`Cannot continue user message`)
      props.continuing = lastMessage
      props.replyAs = getBot(lastMessage.characterId)
      props.continue = lastMessage.msg
      break
    }

    case 'send': {
      // If the chat is a single-user chat, it is always in 'auto-reply' mode
      // Ensure the autoReplyAs parameter is set for single-bot chats
      const isMulti = Object.keys(entities.characters).length > 1
      if (!isMulti) entities.autoReplyAs = entities.char._id

      if (!entities.autoReplyAs) throw new Error(`No character selected to reply with`)
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
  return api.post(`/chat/${chatId}/send`, { text: opts.text, kind: opts.kind })
}

export async function deleteMessages(chatId: string, msgIds: string[]) {
  if (isLoggedIn()) {
    const res = await api.method('delete', `/chat/${chatId}/messages`, { ids: msgIds })
    return res
  }

  const msgs = await localApi.getMessages(chatId)
  const ids = new Set(msgIds)
  const next = msgs.filter((msg) => ids.has(msg._id) === false)
  localApi.saveMessages(chatId, next)

  return localApi.result({ success: true })
}

type GenerateEntities = Awaited<ReturnType<typeof getPromptEntities>>

export async function getPromptEntities() {
  if (isLoggedIn()) {
    const entities = getAuthedPromptEntities()
    if (!entities) throw new Error(`Could not collate data for prompting`)
    return { ...entities, messages: entities.messages.filter((msg) => msg.ooc !== true) }
  }

  const entities = await getGuestEntities()
  if (!entities) throw new Error(`Could not collate data for prompting`)
  return { ...entities, messages: entities.messages.filter((msg) => msg.ooc !== true) }
}

async function getGuestEntities() {
  const { active, chatBots, chatBotMap } = getStore('chat').getState()
  if (!active) return

  const chat = active.chat
  const char = active.char

  if (!chat || !char) return

  const book = chat?.memoryId
    ? loadItem('memory').find((mem) => mem._id === chat.memoryId)
    : undefined

  const profile = loadItem('profile')
  const messages = await localApi.getMessages(chat?._id)
  const user = loadItem('config')
  const settings = getGuestPreset(user, chat)

  return {
    chat,
    char,
    user,
    profile,
    book,
    messages,
    settings,
    members: [profile] as AppSchema.Profile[],
    chatBots,
    autoReplyAs: active.replyAs,
    characters: chatBotMap,
  }
}

function getAuthedPromptEntities() {
  const { active, chatProfiles: members, chatBots, chatBotMap } = getStore('chat').getState()
  if (!active) return

  const { profile, user } = getStore('user').getState()
  if (!profile || !user) return

  const chat = active.chat
  const char = active.char

  const book = getStore('memory')
    .getState()
    .books.list.find((book) => book._id === chat.memoryId)

  const messages = getStore('messages').getState().msgs
  const settings = getAuthGenSettings(chat, user)

  return {
    chat,
    char,
    user,
    profile,
    book,
    messages,
    settings,
    members,
    chatBots,
    autoReplyAs: active.replyAs,
    characters: chatBotMap,
  }
}

function getAuthGenSettings(
  chat: AppSchema.Chat,
  user: AppSchema.User
): Partial<AppSchema.GenSettings> | undefined {
  const presets = getStore('presets').getState().presets
  return getChatPreset(chat, user, presets)
}

function getGuestPreset(user: AppSchema.User, chat: AppSchema.Chat) {
  // The server does not store presets for users
  // Override the `genSettings` property with the locally stored preset data if found
  const presets = loadItem('presets')
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
