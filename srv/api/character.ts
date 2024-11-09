import { Router } from 'express'
import { assertValid } from '/common/valid'
import { store } from '../db'
import { loggedIn } from './auth'
import { errors, handle, StatusError } from './wrap'
import { entityUpload, entityUploadBase64, handleForm } from './upload'
import { PERSONA_FORMATS } from '../../common/adapters'
import { AppSchema } from '../../common/types/schema'
import { CharacterUpdate } from '../db/characters'
import { getVoiceService } from '../voice'
import { generateImage } from '../image'
import { v4 } from 'uuid'
import { validBook } from './memory'
import { isObject, tryParse } from '/common/util'
import { assertStrict } from '/common/valid/validate'

const router = Router()

const characterForm = {
  name: 'string?',
  description: 'string?',
  appearance: 'string?',
  culture: 'string?',

  visualType: 'string?',
  sprite: 'any?',
  avatar: 'string?',

  scenario: 'string?',
  greeting: 'string?',
  sampleChat: 'string?',
  persona: 'string?',
  favorite: 'boolean?',
  voice: 'string?',
  voiceDisabled: 'string?',
  tags: 'string?',
  json: 'any?',

  imageSettings: 'string?',

  // v2 fields start here
  alternateGreetings: 'string?',
  characterBook: 'any?',
  extensions: 'string?',
  systemPrompt: 'string?',
  postHistoryInstructions: 'string?',
  insert: 'string?',
  creator: 'string?',
  characterVersion: 'string?',
} as const

const characterPost = {
  ...characterForm,
  voiceDisabled: 'boolean?',
  persona: 'any?',
  voice: 'any?',
  tags: ['string?'],
  imageSettings: 'any?',
  alternateGreetings: ['string?'],
  extensions: 'any?',
  insert: 'any?',
  json: 'any?',
  folder: 'string?',
} as const

const newCharacterValidator = {
  ...characterForm,
  name: 'string',
  scenario: 'string',
  greeting: 'string',
  sampleChat: 'string',
  persona: 'string',
  originalAvatar: 'string?',
} as const

const personaValidator = {
  kind: PERSONA_FORMATS,
  attributes: 'any',
} as const

const createCharacter = handle(async (req) => {
  const body = handleForm(req, newCharacterValidator)
  const persona = JSON.parse(body.persona) as AppSchema.Persona
  assertValid(personaValidator, persona)

  const sprite = body.sprite ? JSON.parse(body.sprite) : undefined
  const voice = parseAndValidateVoice(body.voice)
  const tags = toArray(body.tags)
  const alternateGreetings = body.alternateGreetings ? toArray(body.alternateGreetings) : undefined
  const insert = body.insert
    ? (JSON.parse(body.insert) as { prompt: string; depth: number })
    : undefined

  const characterBook = body.characterBook
    ? typeof body.characterBook === 'string'
      ? JSON.parse(body.characterBook)
      : body.characterBook
    : undefined

  if (!!characterBook) {
    assertValid(validBook, characterBook)
  }

  const extensions = body.extensions ? JSON.parse(body.extensions) : undefined
  if (!isObject(extensions) && extensions !== undefined) {
    throw new StatusError('Character `extensions` field must be an object or undefined.', 400)
  }

  const imageSettings = body.imageSettings ? JSON.parse(body.imageSettings) : undefined
  const json = body.json ? JSON.parse(body.json) : undefined

  const char = await store.characters.createCharacter(req.user?.userId!, {
    name: body.name,
    persona,
    sampleChat: body.sampleChat,
    description: body.description,
    appearance: body.appearance,
    culture: body.culture,
    scenario: body.scenario,
    greeting: body.greeting,
    visualType: body.visualType,
    sprite,
    avatar: body.originalAvatar,
    favorite: false,
    voiceDisabled: body.voiceDisabled === 'true',
    voice,
    tags,
    alternateGreetings,
    characterBook,
    systemPrompt: body.systemPrompt,
    postHistoryInstructions: body.postHistoryInstructions,
    creator: body.creator,
    characterVersion: body.characterVersion,
    insert: insert,
    imageSettings,
    json,
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

const editPartCharacter = handle(async ({ body, params, userId }) => {
  const id = params.id
  assertStrict({ type: characterPost }, body)

  const update: CharacterUpdate = body

  if (update.avatar?.startsWith('data:image/png;base64')) {
    const filename = await entityUploadBase64('char', id, update.avatar)
    update.avatar = `${filename}?v=${v4().slice(0, 4)}`
  }

  if (!Array.isArray(update.alternateGreetings)) {
    delete update.alternateGreetings
  }

  if (update.characterBook) {
    try {
      assertValid(validBook, update.characterBook)
    } catch (ex: any) {
      throw new StatusError(
        `Could not update character: Character book could not be parsed - ${ex.message}`,
        400
      )
    }
  }

  if (update.extensions && !isObject(update.extensions)) {
    throw new StatusError('Character `extensions` field must be an object or undefined.', 400)
  }

  if (body.imageSettings) {
    try {
      update.imageSettings =
        typeof body.imageSettings === 'string' ? JSON.parse(body.imageSettings) : body.imageSettings
    } catch (ex: any) {
      throw new StatusError(`Character 'imageSettings' could not be parsed: ${ex.message}`, 400)
    }
  }

  if (update.persona) {
    try {
      assertValid(personaValidator, update.persona)
    } catch (ex: any) {
      throw new StatusError(`Character 'persona' could not be parsed: ${ex.message}`, 400)
    }
  }

  const char = await store.characters.partialUpdateCharacter(id, userId, update)
  return char
})

export const bulkUpdate = handle(async (req) => {
  assertValid(
    { characterIds: ['string'], folder: 'string?', addTag: 'string?', removeTag: 'string?' },
    req.body
  )

  const modified = await store.characters.bulkUpdate(req.userId, req.body.characterIds, req.body)

  return { success: true, modified }
})

const editFullCharacter = handle(async (req) => {
  const id = req.params.id
  const body = handleForm(req, characterForm)

  const alternateGreetings = body.alternateGreetings ? toArray(body.alternateGreetings) : undefined
  const characterBook = body.characterBook ? JSON.parse(body.characterBook) : undefined
  if (characterBook !== undefined) {
    assertValid(validBook, characterBook)
  }
  const extensions = body.extensions ? JSON.parse(body.extensions) : undefined
  if (!isObject(extensions) && extensions !== undefined) {
    throw new StatusError('Character `extensions` field must be an object or undefined.', 400)
  }
  const insert = body.insert
    ? (JSON.parse(body.insert) as { prompt: string; depth: number })
    : undefined

  const imageSettings = body.imageSettings ? JSON.parse(body.imageSettings) : undefined
  const json = body.json ? JSON.parse(body.json) : undefined

  const update: CharacterUpdate = {
    name: body.name,
    description: body.description,
    appearance: body.appearance,
    culture: body.culture,
    greeting: body.greeting,
    scenario: body.scenario,
    sampleChat: body.sampleChat,
    visualType: body.visualType,
    sprite: body.sprite ? JSON.parse(body.sprite) : undefined,
    alternateGreetings,
    characterBook: characterBook ?? null,
    systemPrompt: body.systemPrompt,
    postHistoryInstructions: body.postHistoryInstructions,
    creator: body.creator,
    characterVersion: body.characterVersion,
    voiceDisabled: body.voiceDisabled === 'true',
    imageSettings,
    insert,
    json,
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
    update.tags = toArray(body.tags)
  }

  const filename = await entityUpload(
    'char',
    id,
    body.attachments.find((a) => a.field === 'avatar')
  )
  if (filename) {
    update.avatar = filename + `?v=${v4().slice(0, 4)}`
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
  assertValid(
    {
      user: 'any?',
      prompt: 'string',
      ephemeral: 'boolean?',
      source: 'string?',
      noAffix: 'boolean?',
      characterId: 'string?',
      chatId: 'string?',
      requestId: 'string?',
      parent: 'string?',
      model: 'string?',
    },
    body
  )
  const user = userId ? await store.users.getUser(userId) : body.user

  const guestId = userId ? undefined : socketId
  const requestId = body.requestId || v4()
  generateImage(
    {
      user,
      prompt: body.prompt,
      ephemeral: body.ephemeral,
      source: body.source || 'unknown',
      noAffix: body.noAffix,
      chatId: body.chatId,
      characterId: body.characterId,
      requestId,
      parentId: body.parent,
      model: body.model,
    },
    log,
    guestId
  )
  return { success: true, requestId }
})

router.post('/image', createImage)
router.use(loggedIn)
router.post('/', createCharacter)
router.get('/', getCharacters)
router.post('/:id/update', editPartCharacter)
router.post('/:id', editFullCharacter)
router.get('/:id', getCharacter)
router.delete('/:id', deleteCharacter)
router.post('/:id/favorite', editCharacterFavorite)
router.delete('/:id/avatar', removeAvatar)
router.post('/bulk-update', bulkUpdate)

export default router

function toArray(value?: string) {
  if (!value) return []

  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string')

  const parsed = tryParse(value)
  if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string')
  if (typeof parsed === 'string') return []

  if (!parsed) return []
}
