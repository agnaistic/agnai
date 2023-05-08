import { Router } from 'express'
import { assertValid } from 'frisker'
import { store } from '../db'
import { loggedIn } from './auth'
import { errors, handle, StatusError } from './wrap'
import { entityUpload, handleForm } from './upload'
import { PERSONA_FORMATS } from '../../common/adapters'
import { AppSchema } from '../db/schema'
import { CharacterUpdate } from '../db/characters'
import { getVoiceService } from '../voice'
import { generateImage } from '../image'
import { Reference } from 'frisker/dist/types'
import { v4 } from 'uuid'

const router = Router()

type CharacterValidatorType = Omit<
  { [K in keyof AppSchema.Character]: Reference },
  '_id' | 'kind' | 'userId' | 'createdAt' | 'updatedAt'
>

const characterValidator: CharacterValidatorType = {
  name: 'string?',
  description: 'string?',
  culture: 'string?',
  avatar: 'string?',
  scenario: 'string?',
  greeting: 'string?',
  sampleChat: 'string?',
  persona: 'string?',
  favorite: 'boolean?',
  voice: 'string?',
  tags: 'string?',
} as const

const newCharacterValidator: CharacterValidatorType & { originalAvatar: Reference } = {
  ...characterValidator,
  name: 'string',
  scenario: 'string',
  greeting: 'string',
  sampleChat: 'string',
  persona: 'string',
  originalAvatar: 'string?',
}

const personaValidator: Validator = {
  kind: PERSONA_FORMATS,
  attributes: 'any',
} as const

const createCharacter = handle(async (req) => {
  const body = handleForm(req, newCharacterValidator)
  const persona = JSON.parse(body.persona) as AppSchema.Persona
  assertValid(personaValidator, persona)
  const voice = parseAndValidateVoice(body.voice)
  const tags: string[] = body.tags ? JSON.parse(body.tags) : []
  if (tags && (!Array.isArray(tags) || tags.findIndex((t) => typeof t !== 'string') > -1))
    throw new StatusError('Tags must be an array of strings', 400)

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
    voice,
    tags,
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
  const body = await handleForm(req, characterValidator)
  
  const filename = await entityUpload(
    'char',
    id,
    body.attachments.find((a) => a.field === 'avatar')
  )
  const avatar = filename ? filename + `?v=${v4().slice(0, 4)}` : undefined


  const update: CharacterUpdate = {
    name: body.name,
    description: body.description,
    culture: body.culture,
    greeting: body.greeting,
    scenario: body.scenario,
    sampleChat: body.sampleChat,
    avatar,
  }

  if (body.persona) {
    const persona = JSON.parse(body.persona) as AppSchema.Persona
    assertValid(personaValidator, persona)
    update.persona = persona
  }

  if (body.voice) {
    update.voice = parseAndValidateVoice(body.voice)
  }

  if (body.tags) {
    const tags: string[] = JSON.parse(body.tags)
    if (tags && (!Array.isArray(tags) || tags.findIndex((t) => typeof t !== 'string') > -1))
      throw new StatusError('Tags must be an array of strings', 400)
    update.tags = tags
  }

  const char = await store.characters.updateCharacter(id, req.userId!, update)

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
  const favorite = req.body.favorite === true

  const char = await store.characters.updateCharacter(id, req.userId!, {
    favorite: favorite,
  })

  return char
})

function parseAndValidateVoice(json?: string) {
  if (!json) return
  const obj = JSON.parse(json)
  if (!obj) return
  if (!obj.service) return { service: undefined }
  const service = getVoiceService(obj.service)

  if (!service) return

  assertValid(service.validator, obj)
  return obj as unknown as AppSchema.Character['voice']
}

export const createImage = handle(async ({ body, userId, socketId, log }) => {
  assertValid({ user: 'any?', prompt: 'string', ephemeral: 'boolean?' }, body)
  const user = userId ? await store.users.getUser(userId) : body.user

  const guestId = userId ? undefined : socketId
  generateImage(
    {
      user,
      prompt: body.prompt,
      ephemeral: body.ephemeral,
    },
    log,
    guestId
  )
  return { success: true }
})

router.use(loggedIn)
router.post('/', createCharacter)
router.get('/', getCharacters)
router.post('/image', createImage)
router.post('/:id', editCharacter)
router.get('/:id', getCharacter)
router.delete('/:id', deleteCharacter)
router.post('/:id/favorite', editCharacterFavorite)
router.delete('/:id/avatar', removeAvatar)

export default router
