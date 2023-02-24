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
  persona: {
    kind: ['wpp', 'sbf', 'json', 'boostyle'],
    attributes: 'any',
  },
} as const

const createCharacter = handle(async ({ body }) => {
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

const getCharacters = handle(async () => {
  const chars = await store.characters.getCharacters()
  return { characters: chars }
})

const editCharacter = handle(async ({ params, body }) => {
  assertValid(valid, body)
  const id = params.id
  const char = await store.characters.updateCharacter(id, body)
  return char
})

const getCharacter = handle(async ({ params }) => {
  const char = await store.characters.getCharacter(params.id)
  if (!char) {
    throw new StatusError('Character not found', 404)
  }
  return char
})

router.post('/', createCharacter)
router.get('/', getCharacters)
router.post('/:id', editCharacter)
router.get('/:id', getCharacter)

export default router
