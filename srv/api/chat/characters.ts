import { assertValid } from '/common/valid'
import { store } from '../../db'
import { errors, handle } from '../wrap'
import { sendMany } from '../ws'
import { AppSchema } from '/common/types'
import { v4 } from 'uuid'
import { now } from '/srv/db/util'
import { entityUploadBase64 } from '../upload'
import { toArray } from '/common/util'

export const addCharacter = handle(async ({ body, params, userId }) => {
  assertValid({ charId: 'string' }, body)
  const chatId = params.id
  const charId = body.charId

  const chat = await store.chats.getChatOnly(params.id)
  if (!chat) throw errors.NotFound

  if (chat.userId !== userId) throw errors.Forbidden
  if (!chat.characters) {
    chat.characters = {}
  }

  if (chat.characters[charId]) {
    return { success: true }
  }
  if (charId === chat.characterId) throw errors.BadRequest

  const character = await store.characters.getCharacter(userId, charId)
  if (!character) throw errors.Forbidden

  // TODO: Move query to store module
  await store.chats.setChatCharacter(chatId, charId, true)
  const members = await store.chats.getActiveMembers(chatId)
  sendMany(members.concat(chat.userId), { type: 'chat-character-added', character, chatId })

  return { success: true }
})

export const removeCharacter = handle(async ({ params, userId }, _) => {
  const chatId = params.id
  const charId = params.charId

  const chat = await store.chats.getChatOnly(params.id)

  if (!chat) throw errors.NotFound
  if (chat.userId !== userId) throw errors.Forbidden

  if (!chat.characters) {
    chat.characters = {}
  }

  if (!chat.characters[charId]) return { success: true }

  await store.chats.setChatCharacter(chatId, charId, false)

  const members = await store.chats.getActiveMembers(chatId)

  sendMany(members.concat(chat.userId), {
    type: 'chat-character-removed',
    chatId,
    characterId: charId,
  })
  return { success: true }
})

export const upsertTempCharacter = handle(async ({ body, params, userId }) => {
  assertValid(
    {
      _id: 'string?',
      name: 'string',
      description: 'string',
      appearance: 'string?',
      sampleChat: 'string',
      persona: 'any',
      greeting: 'string',
      scenario: 'string',
      avatar: 'string?',
      favorite: 'boolean?',
      deletedAt: 'string?',
      voice: 'any?',
      systemPrompt: 'string?',
      postHistoryInstructions: 'string?',
      alternateGreetings: 'any?',
      characterBook: 'string?',
      visualType: 'string?',
      sprite: 'any?',
      culture: 'string?',
      json: 'any?',
    },
    body
  )

  const chat = await store.chats.getChatOnly(params.id)
  if (!chat) throw errors.NotFound
  if (chat.userId !== userId) throw errors.Forbidden

  const tempCharacters = chat.tempCharacters || {}
  const prev = body._id ? tempCharacters[body._id] : null

  const id =
    body._id && tempCharacters[body._id] ? body._id : `temp-${chat.characterId}_${v4().slice(0, 8)}`

  const upserted: AppSchema.Character = {
    _id: id,
    kind: 'character',
    createdAt: now(),
    updatedAt: now(),
    userId: chat.userId,
    name: body.name,
    persona: body.persona,
    sampleChat: body.sampleChat,
    scenario: body.scenario,
    appearance: body.appearance,
    avatar: body.avatar || prev?.avatar,
    description: body.description,
    greeting: body.greeting,
    favorite: body.favorite !== undefined ? body.favorite : prev?.favorite,
    deletedAt: body.deletedAt,
    voice: body.voice,
    postHistoryInstructions: body.postHistoryInstructions,
    systemPrompt: body.systemPrompt,
    alternateGreetings: body.alternateGreetings ? toArray(body.alternateGreetings) : undefined,
    characterBook: body.characterBook ? JSON.parse(body.characterBook) : undefined,
    visualType: body.visualType,
    sprite: body.sprite,
    culture: body.culture,
    json: body.json,
  }

  tempCharacters[upserted._id] = upserted

  const filename = await entityUploadBase64('char', upserted._id, body.avatar)
  if (filename) {
    upserted.avatar = filename + '?' + v4().slice(0, 4)
  }

  const members = await store.chats.getActiveMembers(params.id)

  await store.chats.update(params.id, { tempCharacters })

  sendMany(members.concat(chat.userId), {
    type: 'chat-temp-character',
    chatId: params.id,
    character: upserted,
  })

  return { success: true, char: upserted }
})
