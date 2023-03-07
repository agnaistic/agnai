import { v4 } from 'uuid'
import { AIAdapter, NOVEL_MODELS } from '../../common/adapters'
import { AppSchema } from '../../srv/db/schema'
import { createStore } from './create'
import { toastStore } from './toasts'
import type { ImportCharacter } from '../pages/Character/ImportCharacter'
import type { NewCharacter } from './character'
import type { NewChat } from './chat'
import { subscribe } from './socket'
import { BOT_REPLACE, createPrompt, SELF_REPLACE } from '../../common/prompt'
import { api } from './api'

type GuestState = {
  chars: AppSchema.Character[]
  profile: AppSchema.Profile
  user: AppSchema.User
  chats: AppSchema.Chat[]
  active?: { chat: AppSchema.Chat; char: AppSchema.Character; msgs: AppSchema.ChatMessage[] }
  lastChatId: string | null
  activeChatId?: string
  partial?: string
  waiting?: string
  retrying?: AppSchema.ChatMessage
}

const KEYS = {
  characters: 'characters',
  profile: 'profile',
  messages: 'messages',
  config: 'config',
  chats: 'chats',
  lastChatId: 'guestLastChatId',
}

var ID = 'anon'

const defaultConfig: AppSchema.User = {
  _id: ID,
  admin: false,
  hash: '',
  kind: 'user',
  oobaUrl: '',
  username: '',
  novelApiKey: '',
  novelModel: NOVEL_MODELS.euterpe,
  hordeKey: '',
  hordeModel: 'PygmalionAI/pygmalion-6b',
  defaultAdapter: 'horde',
  koboldUrl: '',
  luminaiUrl: '',
}

const STARTER_CHARACTER: AppSchema.Character = {
  _id: ID,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  kind: 'character',
  userId: 'anonymous',
  name: 'Robot',
  persona: {
    kind: 'boostyle',
    attributes: {
      species: ['human'],
      mind: ['kind', 'compassionate', 'caring', 'tender', 'forgiving'],
      personality: ['kind', 'compassionate', 'caring', 'tender', 'forgiving'],
      job: ['therapist'],
    },
  },
  sampleChat:
    '{{user}}: Something has been troubling me this week.\r\n{{char}}: *I appear genuinely concerned* What is troubling you?',
  scenario:
    "Robot is in their office. You knock on the door and Robot beckons you inside. You open the door and enter Robot's office.",
  greeting:
    "*A soft smile appears on my face as I see you enter the room* Hello! It's good to see you again. Please have a seat! What is on your mind today?",
}

const defaultProfile: AppSchema.Profile = { _id: '', kind: 'profile', userId: ID, handle: 'You' }

export const guestStore = createStore<GuestState>(
  'guest',
  init()
)((_) => ({
  saveConfig(state, config: Partial<AppSchema.User>) {
    const next = { ...state.user, ...config }
    saveConfig(next)
    toastStore.success('Saved configuration')
    return { user: next }
  },
  async saveProfile(state, handle: string, file?: File) {
    const avatar = await getImageData(file)
    const next: AppSchema.Profile = {
      kind: 'profile',
      _id: '',
      userId: ID,
      handle,
      avatar: avatar || state.profile.avatar,
    }
    saveProfile(next)
    toastStore.success('Saved profile')
    return { profile: next }
  },
  async *createCharacter(state, char: ImportCharacter, onSuccess?: Function) {
    const { avatar: file, ...props } = char
    const avatar = file ? await getImageData(file) : undefined
    const newChar: AppSchema.Character = { ...props, ...baseChar(), avatar, _id: v4() }
    const next = state.chars.concat(newChar)
    saveChars(next)
    yield { chars: next }
    onSuccess?.()
  },
  deleteCharacter(state, charId: string, onSuccess?: Function) {
    const next = state.chars.filter((ch) => ch._id !== charId)
    saveChars(next)
    onSuccess?.()
    return { chars: next }
  },
  async *editCharacter(state, charId: string, char: NewCharacter, onSuccess?: Function) {
    const { avatar: file, ...props } = char
    const avatar = await getImageData(file)
    const newChar: AppSchema.Character = { ...props, ...baseChar(), avatar, _id: v4() }
    const next = state.chars.map((ch) => (ch._id === charId ? newChar : ch))
    saveChars(next)
    yield { chars: next }
    onSuccess?.()
  },
  getChat(state, id: string) {
    const chat = state.chats.find((ch) => ch._id === id)
    if (!chat) return toastStore.error('Could not load chat: Chat not found')

    const char = state.chars.find((ch) => ch._id === chat.characterId)
    if (!char) return toastStore.error('Could not load chat: Character not found')

    const msgs = getMessages(chat._id)
    return { active: { chat, char, msgs, lastChatId: id }, activeChatId: id }
  },
  async *createChat(state, characterId: string, props: NewChat, onSuccess?: (id: string) => void) {
    const char = state.chars.find((ch) => ch._id === characterId)
    if (!char) {
      return toastStore.error('Cannot create character: Character not found')
    }

    const { chat, msg } = createNewChat(char, props)
    const next = state.chats.concat(chat)

    saveChats(next)
    saveMessages(chat._id, [msg])
    yield { chats: next }
    onSuccess?.(chat._id)
  },
  async *editChat(state, chatId: string, edit: Partial<AppSchema.Chat>, onSuccess?: Function) {
    const next = state.chats.map((chat) => (chat._id !== chatId ? chat : { ...chat, ...edit }))
    saveChats(next)
    yield { chats: next }
    onSuccess?.()
  },
  async *deleteChat(state, chatId: string, onSuccess?: Function) {
    const next = state.chats.filter((ch) => ch._id !== chatId)
    deleteMessages(chatId)
    saveChats(next)
    onSuccess?.()
    yield { chats: next }
  },
  async *createMessage(state, chatId: string, message: string) {
    if (!state.active) return toastStore.error(`Cannot send message: No chat active`)
    const {
      active: { char, chat, msgs },
      profile,
      user,
    } = state
    const next = state.retrying ? msgs : msgs.concat(newMessage(chat, ID, message.trim()))
    const prompt = createPrompt({ char, chat, members: [profile], messages: next })
    saveMessages(chatId, next)

    yield { partial: '', waiting: chatId, active: { ...state.active, msgs: next } }
    const res = await api.post(`/chat/${chat._id}/guest-message`, {
      char,
      chat,
      user,
      sender: profile,
      prompt,
    })
    if (res.error) {
      toastStore.error(`Failed to create message: ${res.error}`)
      yield { partial: undefined, waiting: undefined }
    }
  },
  async *recreateMessage(state, chatId: string, msgId: string) {
    if (!state.active) return
    const msgIndex = state.active.msgs.findIndex((m) => m._id === msgId)
    const msg = state.active.msgs[msgIndex]

    if (msgIndex === -1) {
      return toastStore.error('Cannot resend message: Message not found')
    }

    yield { retrying: msg }

    if (msg.characterId) guestStore.deleteMessages(msgId)
    await guestStore.createMessage(chatId, msg.msg)
  },
  deleteMessages(state, id: string) {
    const index = state.active?.msgs.findIndex((m) => m._id === id)
    if (!state.active?.chat) {
      return toastStore.error(`Cannot delete messages: No active chat`)
    }

    if (index === undefined || index === -1) {
      return toastStore.error(`Cannot delete messages: Message not found`)
    }

    const next = state.active?.msgs.slice(0, index)

    saveMessages(state.active.chat._id, next)
    return { active: { ...state.active, msgs: next } }
  },
}))

function init(): GuestState {
  const profile = loadItem(KEYS.profile, defaultProfile)
  const chars = loadItem(KEYS.characters, STARTER_CHARACTER)
  const config = loadItem(KEYS.config, defaultConfig)
  const chats = loadItem(KEYS.chats, [])
  const lastChatId = localStorage.getItem(KEYS.lastChatId)

  return { chars, user: config, profile, chats, lastChatId }
}

function loadItem(key: string, fallback: any) {
  const item = localStorage.getItem(key)
  if (item) return JSON.parse(item)

  localStorage.setItem(key, JSON.stringify(fallback))
  return fallback
}

async function getImageData(file?: File) {
  if (!file) return
  const reader = new FileReader()

  return new Promise<string>((resolve, reject) => {
    reader.readAsDataURL(file)

    reader.onload = (evt) => {
      if (!evt.target?.result) return reject(new Error(`Failed to process image`))
      resolve(evt.target.result.toString())
    }
  })
}

function newMessage(
  chat: AppSchema.Chat,
  senderId: string,
  msg: string,
  fromChar?: boolean
): AppSchema.ChatMessage {
  return {
    _id: v4().slice(0, 8),
    chatId: chat._id,
    kind: 'chat-message',
    userId: fromChar ? undefined : senderId,
    characterId: fromChar ? senderId : undefined,
    msg,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function baseChar() {
  return {
    userId: ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'character' as const,
  }
}

function createNewChat(char: AppSchema.Character, props: NewChat) {
  const chat: AppSchema.Chat = {
    _id: v4(),
    characterId: char._id,
    ...props,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'chat',
    userId: ID,
    memberIds: [],
    messageCount: 1,
  }

  const msg: AppSchema.ChatMessage = {
    _id: v4(),
    chatId: chat._id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'chat-message',
    msg: char.sampleChat,
    characterId: char._id,
  }

  return { chat, msg }
}

function saveChars(state: GuestState['chars']) {
  localStorage.setItem(KEYS.characters, JSON.stringify(state))
}

function saveChats(state: GuestState['chats']) {
  localStorage.setItem(KEYS.chats, JSON.stringify(state))
}

function saveMessages(chatId: string, messages: AppSchema.ChatMessage[]) {
  const key = `messages-${chatId}`
  localStorage.setItem(key, JSON.stringify(messages))
}

function deleteMessages(chatId: string) {
  localStorage.removeItem(`messages-${chatId}`)
}

function getMessages(chatId: string) {
  const messages = localStorage.getItem(`messages-${chatId}`)
  if (!messages) return []

  return JSON.parse(messages) as AppSchema.ChatMessage[]
}

function saveProfile(state: GuestState['profile']) {
  localStorage.setItem(KEYS.profile, JSON.stringify(state))
}

function saveConfig(state: GuestState['user']) {
  localStorage.setItem(KEYS.config, JSON.stringify(state))
}

subscribe(
  'guest-message-retry',
  { messageId: 'string', chatId: 'string', message: 'string' },
  (body) => {
    const { retrying, active, activeChatId } = guestStore.getState()
    if (!active) return

    const msgs = active.msgs

    if (!retrying) return
    if (activeChatId !== body.chatId) return

    const next = msgs
      .filter((msg) => msg._id !== body.messageId)
      .concat({ ...retrying, msg: body.message })

    saveMessages(body.chatId, next)

    guestStore.setState({
      partial: undefined,
      retrying: undefined,
      waiting: undefined,
      active: { ...active, msgs: next },
    })
  }
)

subscribe('guest-message-created', { generated: 'string', chatId: 'string' }, (body) => {
  const { active, activeChatId, retrying } = guestStore.getState()
  if (!active) return
  if (activeChatId !== body.chatId) return

  const msgs = active.msgs
  const newMsg = newMessage(active.chat, active.chat.characterId, body.generated, true)
  const next = msgs.concat(newMsg)

  // const next = retrying
  //   ? msgs.map((msg) => (msg._id === retrying._id ? { ...retrying, msg: body.generated } : msg))
  //   : msgs.concat(newMsg)

  saveMessages(body.chatId, next)

  guestStore.setState({
    active: { ...active, msgs: next },
    retrying: undefined,
    partial: undefined,
    waiting: undefined,
  })
})

subscribe('message-error', { error: 'any', chatId: 'string', messageId: 'string' }, (body) => {
  guestStore.setState({ partial: undefined, waiting: undefined })
})
