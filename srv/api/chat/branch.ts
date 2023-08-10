import { errors, handle } from '../wrap'
import { store } from '/srv/db'
import { getChatTree } from '/srv/db/chats'

export const setChatLeaf = handle(async (req, res) => {
  const { id, leafId } = req.params
  const chat = await store.chats.getChatOnly(id)

  if (!chat) throw errors.NotFound
  if (chat.userId !== req.userId) throw errors.Forbidden

  let tree = await getChatTree(id)

  if (!tree) {
    tree = await store.tree.createChatTree(chat)
  }

  await store.chats.update(req.params.id, { treeLeafId: leafId })
  const messages = await store.msgs.getChatTreeMessages(tree, leafId)
  return { messages }
})

export const forkChat = handle(async (req, res) => {
  const chatId = req.params.id
  const leafId = req.params.leafId

  let { chat, tree } = await store.chats.getChatWithTree(chatId)

  if (!chat) throw errors.NotFound
  if (chat.userId !== req.userId) throw errors.Forbidden

  if (!tree) {
    tree = await store.tree.createChatTree(chat)
  }

  await store.chats.update(chatId, { treeLeafId: leafId })
})
