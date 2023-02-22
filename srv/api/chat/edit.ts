import { assertValid } from 'frisker'
import { store } from '../../db'
import { handle, StatusError } from '../handle'
import { streamMessage } from './common'

export const updateChat = handle(async ({ params, body }) => {
  assertValid({ name: 'string' }, body)
  const id = params.id
  const chat = await store.chats.update(id, body.name)
  return chat
})

export const updateMessage = handle(async ({ body, params }) => {
  assertValid({ message: 'string' }, body)
  const message = await store.chats.editMessage(params.id, body.message)
  return message
})

export const retryMessage = handle(async ({ body, params }, res) => {
  const { id, messageId } = params
  assertValid(
    {
      history: 'any',
      message: 'string',
      adapter: 'string?',
      emphemeral: 'boolean?',
    },
    body
  )
  const chat = await store.chats.getChat(params.id)
  if (!chat) {
    throw new StatusError('Chat not found', 404)
  }

  const char = await store.characters.getCharacter(chat?.characterId)
  if (!char) {
    throw new StatusError('Character not found', 404)
  }

  const generated = await streamMessage(
    { adapter: body.adapter as any, char, chat, history: body.history, message: body.message },
    res
  )

  if (generated) {
    await store.chats.editMessage(messageId, generated)
  }

  res.end()
})
