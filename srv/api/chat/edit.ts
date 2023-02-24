import { assertValid } from 'frisker'
import { ADAPTERS } from '../../../common/adapters'
import { store } from '../../db'
import { streamResponse } from '../adapter/generate'
import { handle, StatusError } from '../handle'

export const updateChat = handle(async ({ params, body }) => {
  assertValid(
    {
      name: 'string',
      adapter: ADAPTERS,
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
    },
    body
  )
  const id = params.id
  const chat = await store.chats.update(id, body)
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
      emphemeral: 'boolean?',
    },
    body
  )
  const response = await streamResponse(
    { chatId: params.id, history: body.history, message: body.message },
    res
  )

  if (!body.emphemeral && response) {
    await store.chats.editMessage(messageId, response.generated)
  }

  res.end()
})
