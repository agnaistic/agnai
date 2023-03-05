import { Response } from 'express'
import { AIAdapter } from '../../../common/adapters'
import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { AppLog } from '../../logger'
import { errors, StatusError } from '../wrap'
import { handleChai } from './chai'
import { handleHorde } from './horde'
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

  const adapterOpts = { ...opts, chat, char, members, user, sender, prompt }

  const handler = handlers[adapter]
  const stream = handler(adapterOpts)

  return { chat, char, stream }
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
