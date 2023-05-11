import { assertValid } from 'frisker'
import { db, store } from '../../db'
import { errors, handle } from '../wrap'
import { now } from '../../db/util'
import { sendMany } from '../ws'

export const addCharacter = handle(async ({ body, params, userId }) => {
  assertValid({ charId: 'string' }, body)
  const chatId = params.id
  const charId = body.charId

  const prev = await store.chats.getChatOnly(params.id)

  if (!prev) throw errors.NotFound
  if (prev.userId !== userId) throw errors.Forbidden
  if (!prev.characterIds) prev.characterIds = []
  if (prev.characterIds.includes(charId)) throw errors.BadRequest
  if (charId === prev.characterId) throw errors.BadRequest

  const character = await store.characters.getCharacter(userId, charId)
  if (!character) throw errors.Forbidden

  // TODO: Move query to store module
  await db('chat').updateOne(
    { _id: chatId },
    { $push: { characterIds: charId }, $set: { updatedAt: now() } }
  )

  const members = await store.chats.getActiveMembers(chatId)
  sendMany(members, { type: 'chat-character-added', character, chatId })

  return { success: true }
})

export const removeCharacter = handle(async ({ params, userId }, _) => {
  const chatId = params.id
  const charId = params.charId

  const chat = await store.chats.getChatOnly(params.id)

  if (!chat) throw errors.NotFound
  if (chat.userId !== userId) throw errors.Forbidden
  if (!chat.characterIds?.includes(charId)) return { success: true }

  // TODO: Move query to store module
  await db('chat').updateOne(
    { _id: chatId, userId },
    { $pull: { characterIds: charId }, $set: { updatedAt: now() } }
  )

  const members = await store.chats.getActiveMembers(chatId)

  sendMany(members, { type: 'chat-character-removed', chatId, characterId: charId })
  return { success: true }
})
