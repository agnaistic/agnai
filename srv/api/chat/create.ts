import { assertValid } from 'frisker'
import { PERSONA_FORMATS } from '../../../common/adapters'
import { store } from '../../db'
import { NewMessage } from '../../db/messages'
import { handle, StatusError } from '../wrap'

export const createChat = handle(async ({ body, user }) => {
  assertValid(
    {
      genPreset: 'string?',
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

export const importChat = handle(async ({ body, userId }) => {
  assertValid(
    {
      characterId: 'string',
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      messages: [{ msg: 'string', characterId: 'string?', userId: 'string?', handle: 'string?' }],
    },
    body
  )

  const character = await store.characters.getCharacter(userId!, body.characterId)

  if (!character) {
    throw new StatusError(`Character not found`, 404)
  }

  const chat = await store.chats.create(body.characterId, {
    name: body.name,
    greeting: body.greeting,
    scenario: body.scenario,
    overrides: character.persona,
    sampleChat: '',
    userId,
  })

  const messages = body.messages.map<NewMessage>((msg) => ({
    chatId: chat._id,
    message: msg.msg,
    adapter: 'import',
    characterId: msg.characterId ? character._id : undefined,
    senderId: msg.userId ? msg.userId : undefined,
    handle: msg.handle,
  }))

  await store.msgs.importMessages(userId, messages)

  return chat
})
