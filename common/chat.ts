import { AppSchema } from './types'

type Created = { _id: string; createdAt: string }

export function resolveTreePath(
  tree: AppSchema.ChatTree,
  msgs: Record<string, AppSchema.ChatMessage>,
  leafId: string
) {
  const branch: AppSchema.ChatMessage[] = []
  const visited = new Set<string>()
  let curr = leafId
  let last = ''

  while (true) {
    const ancestry = tree.tree[curr]
    const msg = msgs[curr]

    if (visited.has(curr)) {
      console.warn(`Last node: ${last}`)
      throw new Error(`Invalid branch: Circular reference (${curr})`)
    }

    if (!ancestry) {
      console.warn(`Last node: ${last}`)
      throw new Error(`Invalid branch: Missing ancestry (${curr})`)
    }

    if (!msg) {
      console.warn(`Last node: ${last}`)
      throw new Error(`Invalid branch: Missing message (${curr})`)
    }

    last = curr
    visited.add(curr)
    branch.push(msg)
    curr = ancestry.parent

    if (!ancestry.parent) break
  }

  return branch
}

export function getChatBranchIds(tree: AppSchema.ChatTree, leafId: string) {
  const branch: string[] = []
  const visited = new Set<string>()

  let curr = leafId
  let last = ''

  while (true) {
    const ancestry = tree.tree[curr]

    if (visited.has(curr)) {
      console.warn(`Last node: ${last}`)
      throw new Error(`Invalid branch: Circular reference (${curr})`)
    }

    if (!ancestry) {
      console.warn(`Last node: ${last}`)
      throw new Error(`Invalid branch: Missing ancestry (${curr})`)
    }

    last = curr
    visited.add(curr)
    branch.push(curr)
    curr = ancestry.parent

    if (!ancestry.parent) break
  }

  return branch
}

export function buildChatTree(messages: Array<Created>): AppSchema.ChatTree['tree'] {
  const tree: AppSchema.ChatTree['tree'] = {}

  let last: string = ''

  for (const msg of messages.slice().sort(sortAsc)) {
    if (last) {
      tree[last].children[msg._id] = 1
    }
    tree[msg._id] = { parent: last, children: {} }
    last = msg._id
  }

  return tree
}

export function sortAsc(l: Created, r: Created) {
  return l.createdAt === r.createdAt ? 0 : l.createdAt < r.createdAt ? -1 : 1
}
