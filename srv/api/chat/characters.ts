import { assertValid } from 'frisker'
import { db, store } from '../../db'
import { errors, handle } from '../wrap'
import { now } from '../../db/util'

export const addCharacter = handle(async ({ body, params, userId }) => {
  assertValid({ charId: 'string' }, body)
  const chatId = params.id
  const charId = body.charId

  const prev = await store.chats.getChat(params.id)

  if (!prev) throw errors.NotFound
  if (prev.userId !== userId) throw errors.Forbidden
  if (!prev.characterIds) prev.characterIds = []
  if (prev.characterIds.includes(charId)) throw errors.BadRequest
  if (charId === prev.characterId) throw errors.BadRequest

  await db('chat').updateOne(
    { _id: chatId },
    { $push: { characterIds: charId }, $set: { updatedAt: now() } }
  )
  return { success: true }
})

export const removeCharacter = handle(async (req, _, userId) => {
  const chatId = req.params.id
  const charId = req.params.charId

  const updated = await db('chat').updateOne(
    { _id: chatId, userId: userId },
    { $pull: { characterIds: charId }, $set: { updatedAt: now() } }
  )

  if (updated.modifiedCount === 0) throw errors.NotFound
  return { success: true }
})
