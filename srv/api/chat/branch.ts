import { errors, handle } from '../wrap'
import { store } from '/srv/db'

export const setChatLeaf = handle(async (req, res) => {
  const { id, leafId } = req.params
  const chat = await store.chats.getChatOnly(id)

  if (!chat) throw errors.NotFound
  if (chat.userId !== req.userId) throw errors.Forbidden

  await store.chats.update(req.params.id, { treeLeafId: leafId })
})
