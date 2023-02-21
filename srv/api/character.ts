import { Router } from 'express'
import { assertValid } from 'frisker'
import { store } from '../db'
import { handle, StatusError } from './handle'

const router = Router()

const valid = {
  name: 'string',
  avatar: 'string?',
  scenario: 'string',
  greeting: 'string',
  sampleChat: 'string',
  persona: 'any',
} as const

router.post(
  '/',
  handle(async ({ body }) => {
    assertValid(valid, body)

    const char = await store.characters.createCharacter({
      name: body.name,
      persona: body.persona,
      sampleChat: body.sampleChat,
      scenario: body.scenario,
      avatar: body.avatar,
      greeting: body.greeting,
    })

    return char
  })
)

router.get(
  '/',
  handle(async () => {
    const chars = await store.characters.getCharacters()
    return { characters: chars }
  })
)

router.post(
  '/:id',
  handle(async ({ params, body }) => {
    assertValid(valid, body)
    const id = params.id
    const char = await store.characters.updateCharacter(id, body)
    return char
  })
)

router.get('/:id', async ({ params }) => {
  const char = await store.characters.getCharacter(params.id)
  if (!char) {
    throw new StatusError('Character not found', 404)
  }
  return char
})

export default router
