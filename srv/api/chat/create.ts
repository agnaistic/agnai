import { RequestHandler } from 'express'
import { assertValid } from 'frisker'
import { store } from '../../db'
import { handle, StatusError } from '../handle'
import { streamMessage } from './common'

export const createChat = handle(async ({ body }) => {
  assertValid(
    {
      characterId: 'string',
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
    },
    body
  )
  const chat = await store.chats.create(body.characterId, body)
  return chat
})

export const generateMessage = handle(async ({ params, body }, res) => {
  const id = params.id
  assertValid(
    { message: 'string', history: 'any', adapater: 'string?', ephemeral: 'boolean?' },
    body
  )

  const chat = await store.chats.getChat(id)
  if (!chat) {
    throw new StatusError('Chat not found', 404)
  }

  const char = await store.characters.getCharacter(chat.characterId)
  if (!char) {
    throw new StatusError('Character not found', 404)
  }

  const userMsg = await store.chats.createChatMessage(id, body.message)
  res.write(JSON.stringify(userMsg))

  const generated = await streamMessage(
    {
      adapter: body.adapater as any,
      chat,
      char,
      message: body.message,
      history: body.history,
    },
    res
  )

  if (!generated) return

  const msg = await store.chats.createChatMessage(id, generated, chat.characterId)
  res.write(JSON.stringify(msg))
  res.end()
})
