import { Router } from 'express'
import { assertValid, Validator } from 'frisker'
import { store } from '../db'
import { loggedIn } from './auth'
import { errors, handle, StatusError } from './wrap'
import { entityUpload, handleForm } from './upload'
import { PERSONA_FORMATS } from '../../common/adapters'
import { AppSchema } from '../db/schema'
import { getVoiceBackend } from '../voice'

const router = Router()

const valid = {
  name: 'string',
  description: 'string?',
  culture: 'string?',
  avatar: 'string?',
  scenario: 'string',
  greeting: 'string',
  sampleChat: 'string',
  persona: {
    kind: PERSONA_FORMATS,
    attributes: 'any',
  },
  originalAvatar: 'string?',
  favorite: 'boolean?',
  voice: 'string?',
} as const

const createCharacter = handle(async (req) => {
  const body = await handleForm(req, { ...valid, persona: 'string' })
  const persona = JSON.parse(body.persona)
  assertValid(valid.persona, persona)
  const voice = parseAndValidateVoice(body.voice)

  const char = await store.characters.createCharacter(req.user?.userId!, {
    name: body.name,
    persona,
    sampleChat: body.sampleChat,
    description: body.description,
    culture: body.culture,
    scenario: body.scenario,
    greeting: body.greeting,
    avatar: body.originalAvatar,
    favorite: false,
    voice: voice,
  })

  const filename = await entityUpload(
    'char',
    char._id,
    body.attachments.find((a) => a.field === 'avatar')
  )

  if (filename) {
    await store.characters.updateCharacter(char._id, req.userId, { avatar: filename })
    char.avatar = filename
  }

  return char
})

const getCharacters = handle(async ({ userId }) => {
  const chars = await store.characters.getCharacters(userId!)
  return { characters: chars }
})

const editCharacter = handle(async (req) => {
  const id = req.params.id
  const body = await handleForm(req, { ...valid, persona: 'string', voice: 'string?' })
  const persona = JSON.parse(body.persona)
  const voice = parseAndValidateVoice(body.voice)

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
    culture: body.culture,
    greeting: body.greeting,
    scenario: body.scenario,
    sampleChat: body.sampleChat,
    voice: voice,
  })

  return char
})

const removeAvatar = handle(async ({ userId, params }) => {
  const char = await store.characters.getCharacter(userId, params.id)
  if (!char) throw errors.NotFound

  await store.characters.updateCharacter(params.id, userId, { avatar: '' })
  return { ...char, avatar: '' }
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

const editCharacterFavorite = handle(async (req) => {
  const id = req.params.id
  const favorite = req.body.favorite == true

  const char = await store.characters.updateCharacter(id, req.userId!, {
    favorite: favorite,
  })

  return char
})

function parseAndValidateVoice(json?: string) {
  if (!json) return undefined
  const obj = JSON.parse(json)
  if (!obj || !obj.backend) return undefined
  const backend = getVoiceBackend(obj.backend)
  assertValid(backend.valid, obj)
  return obj as unknown as AppSchema.Character['voice']
}

router.use(loggedIn)
router.post('/', createCharacter)
router.get('/', getCharacters)
router.post('/:id', editCharacter)
router.get('/:id', getCharacter)
router.delete('/:id', deleteCharacter)
router.post('/:id/favorite', editCharacterFavorite)
router.delete('/:id/avatar', removeAvatar)

export default router
