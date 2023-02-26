import { assertValid } from 'frisker'
import { ADAPTERS } from '../../../common/adapters'
import { store } from '../../db'
import { streamResponse } from '../adapter/generate'
import { errors, handle } from '../handle'
import { publishMany } from '../ws/message'

export const updateChat = handle(async ({ params, body, user }) => {
  assertValid(
    {
      name: 'string',
      adapter: ADAPTERS,
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
      overrides: {
        kind: ['wpp', 'sbf', 'boostyle'],
        attributes: 'any',
      },
    },
    body
  )
  const id = params.id
  const prev = await store.chats.getChat(id)
  if (prev?.userId !== user?.userId) throw errors.Forbidden

  const chat = await store.chats.update(id, body)
  return chat
})

export const updateMessage = handle(async ({ body, params, userId }) => {
  assertValid({ message: 'string' }, body)
  const prev = await store.chats.getMessageAndChat(params.id)

  if (!prev) throw errors.NotFound
  if (prev.chat?.userId !== userId) throw errors.Forbidden

  const message = await store.chats.editMessage(params.id, body.message)
  return message
})

export const retryMessage = handle(async ({ body, params, userId }, res) => {
  const { id, messageId } = params
  assertValid(
    {
      history: 'any',
      message: 'string',
      emphemeral: 'boolean?',
    },
    body
  )
  const prev = await store.chats.getMessageAndChat(messageId)
  if (!prev) throw errors.NotFound
  if (prev.chat?.userId !== userId) throw errors.Forbidden

  const response = await streamResponse(
    { chatId: params.id, history: body.history, message: body.message, senderId: userId! },
    res
  )

  if (!body.emphemeral && response) {
    await store.chats.editMessage(messageId, response.generated)
    publishMany(response.chat.memberIds.concat(userId!), {
      type: 'message-retry',
      messageId,
      chatId: response.chat._id,
      message: response.generated,
    })
  }

  res.end()
})
