import { Document } from 'mongodb'
import { store } from '../../db'
import { errors, handle } from '../wrap'

export const getCharacterChats = handle(async (req) => {
  const character = await store.characters.getCharacter(req.userId!, req.params.id)
  if (!character) {
    throw errors.NotFound
  }

  const list = await store.chats.listByCharacter(req.userId, req.params.id)
  return { character, chats: list }
})

export const getChatDetail = handle(async ({ userId, params }) => {
  const id = params.id
  const detail = await store.chats.getChat(id)

  if (!detail) throw errors.NotFound

  const canView = await store.chats.canViewChat(userId, detail.chat)
  if (!canView) {
    throw errors.Forbidden
  }

  const [members, active] = await Promise.all([
    store.users.getProfiles(detail.chat.userId, detail.chat.memberIds),
    store.chats.getActiveMembers(detail.chat._id),
  ])

  const character = detail.characters.find((ch) => ch._id === detail.chat.characterId)

  const messages = await store.msgs.getMessages(id)

  return { messages, character, members, active, ...detail }
})

export const getAllChats = handle(async (req) => {
  const chats = await store.chats.getAllChats(req.userId!)
  const charIds = getCharacterIds(chats)
  const characters = await store.characters.getCharacterList(Array.from(charIds))
  return { chats, characters }
})

function getCharacterIds(chats: Document[]) {
  const charIds = new Set<string>()

  for (const chat of chats) {
    charIds.add(chat.characterId)

    for (const [id, enabled] of Object.entries(chat.characters || {})) {
      if (enabled) charIds.add(id)
    }
  }

  return Array.from(charIds)
}
