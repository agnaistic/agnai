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
  const chat = await store.chats.getChat(id)

  if (!chat) throw errors.NotFound

  const canView = await store.chats.canViewChat(userId, chat)
  if (!canView) {
    throw errors.Forbidden
  }

  const [character, members, active] = await Promise.all([
    store.characters.getCharacter(chat.userId, chat.characterId),
    store.users.getProfiles(chat.userId, chat.memberIds),
    store.chats.getActiveMembers(chat._id),
  ])

  const messages = await store.msgs.getMessages(id)

  return { chat, messages, character, members, active }
})

export const getAllChats = handle(async (req) => {
  const chats = await store.chats.getAllChats(req.userId!)
  const charIds = new Set(chats.map((ch) => ch.characterId))
  const characters = await store.characters.getCharacterList(Array.from(charIds))
  return { chats, characters }
})
