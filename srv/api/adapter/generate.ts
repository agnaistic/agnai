import { Response } from 'express'
import { AIAdapter } from '../../../common/adapters'
import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { AppLog } from '../../logger'
import { errors, StatusError } from '../wrap'
import { handleChai } from './chai'
import { handleKobold } from './kobold'
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
  horde: handleKobold,
}

export async function generateResponse(
  opts: GenerateOptions & { chat: AppSchema.Chat; char: AppSchema.Character }
) {
  const user = await store.users.getUser(opts.chat.userId)
  if (!user) {
    throw errors.Forbidden
  }

  const members = await store.users.getProfiles(opts.chat.userId, opts.chat.memberIds)
  const sender = members.find((mem) => mem.userId === opts.senderId)
  if (!sender) {
    throw new StatusError('Sender not found in chat members', 400)
  }

  const adapter =
    (opts.chat.adapter === 'default' ? user.defaultAdapter : opts.chat.adapter) ||
    user.defaultAdapter
  const prompt = await createPrompt({ ...opts, members, sender })
  const adapterOpts = { ...opts, members, user, sender, prompt }

  const handler = handlers[adapter]
  return handler(adapterOpts)
}

export async function createResponseStream(opts: GenerateOptions) {
  const chat = await store.chats.getChat(opts.chatId)
  if (!chat) {
    throw new StatusError('Chat not found', 404)
  }

  const isOwnerOrMember = opts.senderId === chat.userId || chat.memberIds.includes(opts.senderId)
  if (!isOwnerOrMember) {
    throw errors.Forbidden
  }

  const char = await store.characters.getCharacter(chat.userId, chat.characterId)
  if (!char) {
    throw new StatusError('Character not found', 404)
  }

  const stream = await generateResponse({ ...opts, chat, char }).catch((err: Error) => err)
  if (stream instanceof Error) {
    throw stream
  }

  return { chat, char, stream }
}

export async function streamResponse(opts: GenerateOptions, res: Response) {
  const { chat, char, stream } = await createResponseStream(opts)

  if (stream instanceof Error) {
    res.status(500).send({ message: stream.message })
    return
  }

  let generated = ''
  for await (const msg of stream) {
    if (typeof msg !== 'string') {
      res.status(500)
      res.write(JSON.stringify(msg))
      res.send()
      return
    }

    generated = msg
    res.write(generated)
    res.write('\n\n')
  }

  return { chat, char, generated }
}
