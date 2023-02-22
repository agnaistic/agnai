import { store } from '../../db'
import { handle, StatusError } from '../handle'

export const getCharacterChats = handle(async (req) => {
  const character = await store.characters.getCharacter(req.params.id)
  const list = await store.chats.listByCharacter(req.params.id)
  return { character, chats: list }
})

export const getChatDetail = handle(async ({ params }) => {
  const id = params.id
  const chat = await store.chats.getChat(id)

  if (!chat) {
    throw new StatusError('Chat not found', 404)
  }

  const character = await store.characters.getCharacter(chat.characterId)
  const messages = await store.chats.getMessages(id)
  return { chat, messages, character }
})
