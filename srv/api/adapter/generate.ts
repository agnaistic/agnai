import { AIAdapter } from '../../../common/adapters'
import { mapPresetsToAdapter, defaultPresets, isDefaultPreset } from '../../../common/presets'
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

export async function createResponseStream(opts: GenerateOptions) {
  const { chat, char, user, members } = await getResponseEntities(opts.chatId, opts.senderId)

  const isOwnerOrMember = opts.senderId === chat.userId || chat.memberIds.includes(opts.senderId)
  if (!isOwnerOrMember) {
    throw errors.Forbidden
  }

  const sender = members.find((mem) => mem.userId === opts.senderId)
  if (!sender) {
    throw new StatusError('Sender not found in chat members', 400)
  }

  const adapter = getAdapater(chat, user)

  const prompt = await createPrompt({ char, chat, members, retry: opts.retry })

  const rawGenSettings = await getGenerationSettings(chat, adapter)
  const adapterOpts = {
    ...opts,
    chat,
    char,
    members,
    user,
    sender,
    prompt,
    genSettings: mapPresetsToAdapter(rawGenSettings, adapter),
  }

  const handler = handlers[adapter]
  const stream = handler(adapterOpts)

  return { chat, char, stream }
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
  logger.info({ prompt }, 'Image prompt')
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

  const members = await store.users.getProfiles(chat.userId, chat.memberIds)

  return { chat, char, user, members }
}

function getAdapater(chat: AppSchema.Chat, user: AppSchema.User) {
  if (chat.adapter && chat.adapter !== 'default') return chat.adapter

  return user.defaultAdapter
}

async function getGenerationSettings(chat: AppSchema.Chat, adapter: AIAdapter) {
  if (chat.genSettings) return chat.genSettings
  if (!chat.genPreset) return defaultPresets.basic

  if (isDefaultPreset(chat.genPreset)) return defaultPresets[chat.genPreset]

  const preset = await store.users.getUserPreset(chat.genPreset)
  return preset || defaultPresets.basic
}
