import { v4 } from 'uuid'
import { api, isLoggedIn } from '../api'
import { loadItem, localApi } from './storage'
import { buildChatTree } from '/common/chat'
import { AppSchema } from '/common/types'
import { replace } from '/common/util'

export { treesApi }

const treesApi = {
  forkChat,
}

async function forkChat(chatId: string, leafId: string) {
  if (isLoggedIn()) {
    const res = await api.method<{ messages: AppSchema.ChatMessage[] }>(
      `post`,
      `/chat/${chatId}/fork/${leafId}`
    )
    return res
  }

  const chats = await loadItem('chats')
  const chat = chats.find((ch) => ch._id === chatId)

  if (!chat) {
    return localApi.error(`Chat not found`)
  }

  chat.treeLeafId = leafId

  const trees = await loadItem('trees')
  let tree = trees.find((t) => t.chatId === chatId)

  if (!tree) {
    const messages = await localApi.getMessages(chatId)
    tree = {
      _id: v4(),
      chatId,
      kind: 'chat-tree',
      tree: buildChatTree(messages),
      userId: 'anon',
    }
    trees.push(tree)
    await localApi.saveTrees(trees)
  }

  await localApi.saveChats(replace(chatId, chats, { treeLeafId: leafId }))

  const leaf = tree.tree[leafId]
  if (!leaf) {
    return localApi.error(`Cannot fork message: Message not found (${leafId})`)
  }

  const messages = await localApi.getChatMessages(tree, leafId)
  return localApi.result({ messages })
}
