import { assertValid } from 'frisker'
import { PERSONA_FORMATS } from '../../../common/adapters'
import { store } from '../../db'
import { handle, StatusError } from '../wrap'

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

// export const importChat = handle(async ({ body, userId }) => {
//   assertValid(
//     {
//       characterId: 'string',
//       name: 'string',
//       greeting: 'string',
//       scenario: 'string',
//       overrides: {
//         kind: PERSONA_FORMATS,
//         attributes: 'any',
//       },
//       messages: [{ msg: 'string', characterId: 'string?', userId: 'string?' }],
//     },
//     body
//   )

//   const character = await store.characters.getCharacter(userId!, body.characterId)

//   if (!character) {
//     throw new StatusError(`Character not found`, 404)
//   }
// })
