import { assertValid } from '/common/valid'
import { store } from '../../db'
import { errors, handle } from '../wrap'
import { sendMany } from '../ws'

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
