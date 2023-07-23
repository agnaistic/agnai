import { assertValid } from '/common/valid'
import { store } from '../../db'
import { errors, handle } from '../wrap'
import { sendMany } from '../ws'
import { AppSchema } from '/common/types'
import { v4 } from 'uuid'
import { now } from '/srv/db/util'

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
  if (!chat.characters) {
    chat.characters = {}
  }

  if (chat.userId !== userId) throw errors.Forbidden
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

export const addTempCharacter = handle(async ({ body, params, userId }) => {
  assertValid(
    {
      name: 'string',
      description: 'string',
      appearance: 'string',
      sampleChat: 'string',
      persona: 'any',
      greeting: 'string',
      scenario: 'string',
      avatar: 'string?',
    },
    body
  )

  const chat = await store.chats.getChatOnly(params.id)
  if (!chat) throw errors.NotFound
  if (chat.userId !== userId) throw errors.Forbidden

  const tempCharacters = chat.tempCharacters || {}
  const newChar: AppSchema.Character = {
    _id: `temp-${v4().slice(0, 8)}`,
    kind: 'character',
    createdAt: now(),
    updatedAt: now(),
    userId: chat.userId,
    name: body.name,
    persona: body.persona,
    sampleChat: body.sampleChat,
    scenario: body.scenario,
    appearance: body.appearance,
    avatar: body.avatar,
    description: body.description,
    greeting: body.greeting,
  }

  tempCharacters[newChar._id] = newChar

  const members = await store.chats.getActiveMembers(params.id)
  await store.chats.update(params.id, { tempCharacters })
  sendMany(members.concat(chat.userId), {
    type: 'chat-temp-character',
    chatId: params.id,
    character: newChar,
  })

  return { success: true, char: newChar }
})
