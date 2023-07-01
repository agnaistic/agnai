import { assertValid } from '/common/valid'
import { PERSONA_FORMATS } from '../../../common/adapters'
import { store } from '../../db'
import { NewMessage } from '../../db/messages'
import { handle, StatusError } from '../wrap'

export const createChat = handle(async ({ body, user, userId }) => {
  assertValid(
    {
      genPreset: 'string?',
      characterId: 'string',
      name: 'string',
      mode: ['standard', 'adventure', null],
      greeting: 'string?',
      scenario: 'string?',
      sampleChat: 'string?',
      overrides: { '?': 'any?', kind: PERSONA_FORMATS, attributes: 'any' },
      useOverrides: 'boolean?',
      scenarioIds: ['string?'],
    },
    body
  )

  const character = await store.characters.getCharacter(userId, body.characterId)
  const chat = await store.chats.create(body.characterId, {
    ...body,
    greeting: body.greeting ?? character?.greeting,
    userId: user?.userId!,
  })
  return chat
})

export const importChat = handle(async ({ body, userId }) => {
  assertValid(
    {
      characterId: 'string',
      name: 'string',
      greeting: 'string?',
      scenario: 'string?',
      messages: [
        {
          msg: 'string',
          characterId: 'string?',
          userId: 'string?',
          handle: 'string?',
          ooc: 'boolean?',
        },
      ],
    },
    body
  )

  const character = await store.characters.getCharacter(userId!, body.characterId)

  if (!character) {
    throw new StatusError(`Character not found`, 404)
  }

  const chat = await store.chats.create(body.characterId, {
    name: body.name,
    greeting: body.greeting ?? character.greeting,
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
    ooc: msg.ooc ?? false,
    event: undefined,
  }))

  await store.msgs.importMessages(userId, messages)

  return chat
})
