import { assertValid } from 'frisker'
import { PERSONA_FORMATS } from '../../../common/adapters'
import { store } from '../../db'
import { handle } from '../wrap'

export const createChat = handle(async ({ body, user }) => {
  assertValid(
    {
      characterId: 'string',
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
      overrides: {
        kind: PERSONA_FORMATS,
        attributes: 'any',
      },
    },
    body
  )
  const chat = await store.chats.create(body.characterId, { ...body, userId: user?.userId! })
  return chat
})
