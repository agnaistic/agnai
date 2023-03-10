import { AIAdapter } from '../../../common/adapters'
import {
  mapPresetsToAdapter,
  defaultPresets,
  isDefaultPreset,
  getGenSettings,
} from '../../../common/presets'
import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { AppLog, logger } from '../../logger'
import { errors, StatusError } from '../wrap'
import { handleChai } from './chai'
import { handleHorde } from './horde'
import { createImagePrompt } from './image'
import { handleKobold } from './kobold'
import { handleLuminAI } from './luminai'
import { handleNovel } from './novel'
import { handleOoba } from './ooba'
import { createPrompt } from './prompt'
import { ModelAdapter } from './type'

export type GenerateOptions = {
  senderId: string
  chatId: string
  message: string
  log: AppLog
  retry?: AppSchema.ChatMessage
}

const handlers: { [key in AIAdapter]: ModelAdapter } = {
  chai: handleChai,
  novel: handleNovel,
  kobold: handleKobold,
  ooba: handleOoba,
  horde: handleHorde,
  luminai: handleLuminAI,
}

export async function createGuestTextStream(opts: {
  chat: AppSchema.Chat
  user: AppSchema.User
  sender: AppSchema.Profile
  char: AppSchema.Character
  log: AppLog
  prompt: string
}) {
  const adapter = getAdapater(opts.chat, opts.user)
  const rawSettings = await getGenerationSettings(opts.chat, adapter, true)
  const settings = mapPresetsToAdapter(rawSettings, adapter)

  const handler = handlers[adapter]
  const stream = handler({ ...opts, settings, members: [opts.sender], guest: true })
  return { stream, adapter }
}

export async function createTextStream(opts: GenerateOptions) {
  const { chat, char, user, members, settings, adapter } = await getResponseEntities(
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

  const prompt = await createPrompt({
    char,
    chat,
    members,
    retry: opts.retry,
    settings,
  })

  const adapterOpts = {
    ...opts,
    chat,
    char,
    members,
    user,
    sender,
    prompt,
    settings,
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
  const rawGenSettings = await getGenerationSettings(chat, adapter)
  const settings = mapPresetsToAdapter(rawGenSettings, adapter)

  return { chat, char, user, members, adapter, settings }
}

function getAdapater(chat: AppSchema.Chat, user: AppSchema.User) {
  if (chat.adapter && chat.adapter !== 'default') return chat.adapter

  return user.defaultAdapter
}

async function getGenerationSettings(chat: AppSchema.Chat, adapter: AIAdapter, guest?: boolean) {
  if (chat.genSettings) return chat.genSettings
  if (!chat.genPreset) return defaultPresets.basic

  if (isDefaultPreset(chat.genPreset)) return defaultPresets[chat.genPreset]
  if (guest) return defaultPresets.basic

  const preset = await store.users.getUserPreset(chat.genPreset)
  return preset || defaultPresets.basic
}
