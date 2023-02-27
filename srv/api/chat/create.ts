import { assertValid } from 'frisker'
import { store } from '../../db'
import { handle } from '../handle'

export const createChat = handle(async ({ body, user }) => {
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
  const chat = await store.chats.create(body.characterId, { ...body, userId: user?.userId! })
  return chat
})
