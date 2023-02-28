import { store } from '../../db'
import { errors, handle } from '../wrap'

export const getCharacterChats = handle(async (req) => {
  const character = await store.characters.getCharacter(req.userId!, req.params.id)
  const list = await store.chats.listByCharacter(req.params.id)
  return { character, chats: list }
})

export const getChatDetail = handle(async ({ userId, params }) => {
  const id = params.id
  const chat = await store.chats.getChat(id)

  if (!chat) throw errors.NotFound
  if (!store.chats.canViewChat(userId!, chat)) {
    throw errors.Forbidden
  }

  const character = await store.characters.getCharacter(chat.userId, chat.characterId)
  const messages = await store.chats.getMessages(id)
  const members = await store.users.getProfiles(chat.userId, chat.memberIds)

  return { chat, messages, character, members }
})
