import { v4 } from 'uuid'
import { AppSchema } from '/common/types/schema'
import { db } from './client'
import { buildChatTree } from '/common/chat'

export async function createChatTree(chat: AppSchema.Chat) {
  const messages = (await db('chat-message')
    .find({ chatId: chat._id })
    .project({ _id: 1, createdAt: 1 })
    .sort({ createdAt: 'asc' })
    .toArray()) as Array<{ _id: string; createdAt: string }>

  const doc: AppSchema.ChatTree = {
    _id: v4(),
    kind: 'chat-tree',
    chatId: chat._id,
    userId: chat.userId,
    tree: {},
  }

  const tree: AppSchema.ChatTree['tree'] = buildChatTree(messages)

  let last: string = ''

  for (const msg of messages) {
    if (last) {
      tree[last].children[msg._id] = 1
    }
    tree[msg._id] = { parent: last, children: {} }
    last = msg._id
  }

  doc.tree = tree
  await db('chat-tree').insertOne(doc)
  return doc
}

export async function assignMessageParent(opts: {
  chatId: string
  parentId: string
  messageId: string
}) {
  const { parentId, messageId } = opts

  await db('chat-tree').updateOne(
    { chatId: opts.chatId },
    { $set: { [`tree.${parentId}.children.${messageId}`]: 1 } }
  )
}

export async function updateTree(chatId: string, props: Partial<AppSchema.ChatTree>) {
  await db('chat-tree').updateOne({ chatId }, { $set: { ...props } })
}
