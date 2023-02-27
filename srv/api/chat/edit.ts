import { assertValid } from 'frisker'
import { ADAPTERS } from '../../../common/adapters'
import { store } from '../../db'
import { errors, handle } from '../handle'

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
