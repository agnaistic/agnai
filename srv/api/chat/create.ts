import { assertValid } from 'frisker'
import { store } from '../../db'
import { streamResponse } from '../adapter/generate'
import { handle, StatusError } from '../handle'

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

  const userMsg = await store.chats.createChatMessage(id, body.message)
  res.write(JSON.stringify(userMsg))

  const response = await streamResponse(
    {
      chatId: id,
      message: body.message,
      history: body.history,
    },
    res
  )

  if (!response) return

  const msg = await store.chats.createChatMessage(
    id,
    response.generated,
    response.chat.characterId,
    body.ephemeral
  )
  res.write(JSON.stringify(msg))
  res.end()
})
