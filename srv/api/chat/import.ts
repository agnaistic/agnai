import { assertValid } from 'frisker'
import { PERSONA_FORMATS } from '../../../common/adapters'
import { store } from '../../db'
import { errors, handle } from '../wrap'

export const importChat = handle(async ({ body, user }) => {
  // Should guest users be allowed to import chats?
  if (!user) throw errors.Forbidden

  assertValid(
    {
      characterId: 'string',
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
      messages: [
        // In lieu of some mechanism to map imported messages to existing Agnai users or characters,
        // we assume that all bot messages are from the character and user messages are from the
        // chat owner.
        { message: 'string', sender: ['character', 'user'] },
      ],
      overrides: {
        kind: PERSONA_FORMATS,
        attributes: 'any',
      },
    },
    body
  )
  const { messages, ...chatBody } = body
  const chat = await store.chats.create(chatBody.characterId, {
    ...chatBody,
    userId: user?.userId!,
  })

  await store.msgs.createManyChatMessages(
    messages.map((m) => ({
      chatId: chat._id,
      message: m.message,
      adapter: chat.adapter,
      ...(m.sender === 'character' ? { characterId: chat.characterId } : { userId: chat.userId }),
    }))
  )

  return chat
})
