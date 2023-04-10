import { Router } from 'express'
import { assertValid } from 'frisker'
import { store } from '../db'
import { loggedIn } from './auth'
import { handle, StatusError } from './wrap'
import { entityUpload, handleForm } from './upload'
import { PERSONA_FORMATS } from '../../common/adapters'
import { v4 } from 'uuid'

const router = Router()

const valid = {
  name: 'string',
  description: 'string?',
  avatar: 'string?',
  scenario: 'string',
  greeting: 'string',
  sampleChat: 'string',
  persona: {
    kind: PERSONA_FORMATS,
    attributes: 'any',
  },
  originalAvatar: 'string?',
} as const

const createCharacter = handle(async (req) => {
  const body = await handleForm(req, { ...valid, persona: 'string' })
  const persona = JSON.parse(body.persona)
  assertValid(valid.persona, persona)

  const char = await store.characters.createCharacter(req.user?.userId!, {
    name: body.name,
    persona,
    sampleChat: body.sampleChat,
    description: body.description,
    scenario: body.scenario,
    greeting: body.greeting,
    avatar: body.originalAvatar,
  })

  const filename = await entityUpload(
    'char',
    char._id,
    body.attachments.find((a) => a.field === 'avatar')
  )

  if (filename) {
    await store.characters.updateCharacter(char._id, req.userId, { avatar: filename })
  }

  return char
})

const getCharacters = handle(async ({ userId }) => {
  const chars = await store.characters.getCharacters(userId!)
  return { characters: chars }
})

const editCharacter = handle(async (req) => {
  const id = req.params.id
  const body = await handleForm(req, { ...valid, persona: 'string' })
  const persona = JSON.parse(body.persona)

  assertValid(valid.persona, persona)

  const filename = await entityUpload(
    'char',
    id,
    body.attachments.find((a) => a.field === 'avatar')
  )

  const avatar = filename ? filename : undefined

  const char = await store.characters.updateCharacter(id, req.userId!, {
    name: body.name,
    persona,
    avatar,
    description: body.description,
    greeting: body.greeting,
    scenario: body.scenario,
    sampleChat: body.sampleChat,
  })

  return char
})

const getCharacter = handle(async ({ userId, params }) => {
  const char = await store.characters.getCharacter(userId!, params.id)
  if (!char) {
    throw new StatusError('Character not found', 404)
  }
  return char
})

const deleteCharacter = handle(async ({ userId, params }) => {
  const id = params.id
  await store.characters.deleteCharacter({ userId: userId!, charId: id })
  return { success: true }
})

router.use(loggedIn)
router.post('/', createCharacter)
router.get('/', getCharacters)
router.post('/:id', editCharacter)
router.get('/:id', getCharacter)
router.delete('/:id', deleteCharacter)

export default router
