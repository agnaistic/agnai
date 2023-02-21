import { Router } from 'express'
import { assertValid } from 'frisker'
import { store } from '../db'
import { handle } from './handle'

const router = Router()

router.get(
  '/:id/chats',
  handle(async (req) => {
    const character = await store.characters.getCharacter(req.params.id)
    const list = await store.chats.listByCharacter(req.params.id)
    return { character, chats: list }
  })
)

router.get(
  '/:id',
  handle(async ({ params }) => {
    const id = params.id
    const chat = await store.chats.getChat(id)
    const character = await store.characters.getCharacter(chat.characterId)
    const messages = await store.chats.getMessages(id)
    return { chat, messages, character }
  })
)

router.post(
  '/:id',
  handle(async ({ params, body }) => {
    assertValid({ name: 'string' }, body)
    const id = params.id
    const chat = await store.chats.update(id, body.name)
    return chat
  })
)

router.post(
  '/',
  handle(async ({ body }) => {
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
    const chat = await store.chats.create(body.characterId, body)
    return chat
  })
)

export default router
