import { AIAdapter } from '../../common/adapters'
import {
  mapPresetsToAdapter,
  defaultPresets,
  isDefaultPreset,
  getFallbackPreset,
} from '../../common/presets'
import { store } from '../db'
import { AppSchema } from '../db/schema'
import { AppLog, logger } from '../logger'
import { errors, StatusError } from '../api/wrap'
import { handleChai } from './chai'
import { handleHorde } from './horde'
import { createImagePrompt } from './image'
import { handleKobold } from './kobold'
import { handleLuminAI } from './luminai'
import { handleNovel } from './novel'
import { handleOoba } from './ooba'
import { handleOAI } from './openai'
import { getMessagesForPrompt } from './prompt'
import { AdapterProps, ModelAdapter } from './type'
import { createPrompt } from '../../common/prompt'

export type GenerateOptions = {
  senderId: string
  chatId: string
  message: string
  log: AppLog
  retry?: AppSchema.ChatMessage
  continue?: string
}

const handlers: { [key in AIAdapter]: ModelAdapter } = {
  chai: handleChai,
  novel: handleNovel,
  kobold: handleKobold,
  ooba: handleOoba,
  horde: handleHorde,
  luminai: handleLuminAI,
  openai: handleOAI,
}

export async function createGuestTextStream(opts: {
  chat: AppSchema.Chat
  user: AppSchema.User
  sender: AppSchema.Profile
  char: AppSchema.Character
  log: AppLog
  socketId: string
  prompt: string
  lines?: string[]
  continue?: string
}) {
  const adapter = getAdapater(opts.chat, opts.user)
  const gen = await getGenerationSettings(opts.user, opts.chat, adapter, true)
  const settings = mapPresetsToAdapter(gen, adapter)

  const handler = handlers[adapter]
  const stream = handler({ ...opts, settings, members: [opts.sender], guest: opts.socketId, gen })
  return { stream, adapter }
}

export async function createTextStream(opts: GenerateOptions) {
  const { chat, char, user, members, settings, adapter, gen } = await getResponseEntities(
    opts.chatId,
    opts.senderId
  )

  const isOwnerOrMember = opts.senderId === chat.userId || chat.memberIds.includes(opts.senderId)
  if (!isOwnerOrMember) {
    throw errors.Forbidden
  }

  const sender = members.find((mem) => mem.userId === opts.senderId)
  if (!sender) {
    throw new StatusError('Sender not found in chat members', 400)
  }

  const promptOpts = {
    char,
    chat,
    members,
    retry: opts.retry,
    settings,
    continue: opts.continue,
  }
  const { messages } = await getMessagesForPrompt(promptOpts)

  const prompt = createPrompt({
    char,
    chat,
    members,
    retry: opts.retry,
    settings,
    continue: opts.continue,
    messages,
    config: user,
  })

  const adapterOpts: AdapterProps = {
    ...opts,
    chat,
    char,
    members,
    user,
    sender,
    settings,
    log: opts.log,
    gen,
    ...prompt,
  }

  const handler = handlers[adapter]
  const stream = handler(adapterOpts)

  return { chat, char, stream, adapter }
}

export async function createImageStream(opts: { chatId: string; senderId: string }) {
  const { chat, char, members } = await getResponseEntities(opts.chatId, opts.senderId)

  const isOwnerOrMember = opts.senderId === chat.userId || chat.memberIds.includes(opts.senderId)
  if (!isOwnerOrMember) {
    throw errors.Forbidden
  }

  const sender = members.find((mem) => mem.userId === opts.senderId)
  if (!sender) {
    throw new StatusError('Sender not found in chat members', 400)
  }

  const prompt = await createImagePrompt({ char, members, chat })
  logger.debug({ prompt }, 'Image prompt')

  return prompt
}

export async function getResponseEntities(chatId: string, senderId: string) {
  const chat = await store.chats.getChat(chatId)
  if (!chat) {
    throw new StatusError('Chat not found', 404)
  }

  const isOwnerOrMember = senderId === chat.userId || chat.memberIds.includes(senderId)
  if (!isOwnerOrMember) {
    throw errors.Forbidden
  }

  const user = await store.users.getUser(chat.userId)
  if (!user) {
    throw errors.Forbidden
  }

  const char = await store.characters.getCharacter(chat.userId, chat.characterId)
  if (!char) {
    throw new StatusError('Character not found', 404)
  }

  const adapter = getAdapater(chat, user)
  const members = await store.users.getProfiles(chat.userId, chat.memberIds)
  const gen = await getGenerationSettings(user, chat, adapter)
  const settings = mapPresetsToAdapter(gen, adapter)

  return { chat, char, user, members, adapter, settings, gen }
}

function getAdapater(chat: AppSchema.Chat, user: AppSchema.User) {
  if (chat.adapter && chat.adapter !== 'default') return chat.adapter

  return user.defaultAdapter
}

async function getGenerationSettings(
  user: AppSchema.User,
  chat: AppSchema.Chat,
  adapter: AIAdapter,
  guest?: boolean
): Promise<Partial<AppSchema.GenSettings>> {
  if (chat.genPreset) {
    if (isDefaultPreset(chat.genPreset)) {
      return { ...defaultPresets[chat.genPreset], src: 'user-chat-genpreset-default' }
    }

    if (guest) {
      if (chat.genSettings) return { ...chat.genSettings, src: 'guest-chat-gensettings' }
      return { ...getFallbackPreset(adapter), src: 'guest-fallback' }
    }

    const preset = await store.presets.getUserPreset(chat.genPreset)
    if (preset) {
      preset.src = 'user-chat-genpreset-custom'
      return preset
    }
  }

  if (chat.genSettings) {
    const src = guest ? 'guest-chat-gensettings' : 'user-chat-gensettings'
    return { ...chat.genSettings, src }
  }

  const servicePreset = user.defaultPresets?.[adapter]
  if (servicePreset) {
    if (isDefaultPreset(servicePreset)) {
      return {
        ...defaultPresets[servicePreset],
        src: `${guest ? 'guest' : 'user'}-service-defaultpreset`,
      }
    }

    // No user presets are persisted for anonymous users
    // Do not try to check the database for them
    if (guest) {
      return { ...getFallbackPreset(adapter), src: 'guest-fallback' }
    }

    const preset = await store.presets.getUserPreset(servicePreset)
    if (preset) {
      preset.src = 'user-service-custom'
      return preset
    }
  }

  return {
    ...getFallbackPreset(adapter),
    src: guest ? 'guest-fallback-last' : 'user-fallback-last',
  }
}
