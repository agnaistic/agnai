import { Response } from 'express'
import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { StatusError } from '../handle'
import { handleChai } from './chai'
import { handleKobold } from './kobold'
import { handleNovel } from './novel'

export type GenerateOptions = {
  chatId: string
  history: AppSchema.ChatMessage[]
  message: string
}

export async function generateResponse(
  opts: GenerateOptions & { chat: AppSchema.Chat; char: AppSchema.Character }
) {
  const settings = await store.settings.get()
  const adapter = opts.chat.adapter || settings.defaultAdapter || 'kobold'

  switch (adapter) {
    case 'chai':
      return handleChai({ ...opts, settings })

    case 'novel':
      return handleNovel({ ...opts, settings })

    case 'kobold':
    case 'default':
    default: {
      return handleKobold({ ...opts, settings })
    }
  }
}

export async function streamResponse(opts: GenerateOptions, res: Response) {
  const chat = await store.chats.getChat(opts.chatId)
  if (!chat) {
    throw new StatusError('Chat not found', 404)
  }

  const char = await store.characters.getCharacter(chat.characterId)
  if (!char) {
    throw new StatusError('Character not found', 404)
  }

  const stream = await generateResponse({ ...opts, chat, char }).catch((err: Error) => err)

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
