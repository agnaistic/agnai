import { assertValid } from 'frisker'
import { config } from '../../config'
import { store } from '../../db'
import { errors, handle } from '../wrap'
import { publishMany } from '../ws/handle'

export const updateChat = handle(async ({ params, body, user }) => {
  assertValid(
    {
      name: 'string',
      adapter: ['default', ...config.adapters] as const,
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

  if (!prev || !prev.chat) throw errors.NotFound
  if (prev.chat?.userId !== userId) throw errors.Forbidden

  const message = await store.chats.editMessage(params.id, body.message)

  publishMany(prev.chat?.memberIds.concat(prev.chat.userId), {
    type: 'message-edited',
    messageId: params.id,
    message: body.message,
  })

  return message
})
