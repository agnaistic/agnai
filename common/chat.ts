import { debug } from './debug'
import { AppSchema } from './types'

type Created = { _id: string; createdAt: string }

export type ChatTree = Record<string, ChatNode>

export type ChatNode = {
  depth: number
  msg: AppSchema.ChatMessage
  children: Record<string, true>
}

export type ChatDepths = Record<number, string[]>

export function toChatGraph(messages: AppSchema.ChatMessage[]): { tree: ChatTree; root: string } {
  const log = debug('build-graph')
  const tree: ChatTree = {}

  const seenMsgs: Record<string, boolean> = {}

  // Initial child-less tree
  for (const msg of messages) {
    tree[msg._id] = { msg, depth: -1, children: {} }
  }

  // Populate the depths and descendants
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (seenMsgs[msg._id]) {
      log(`seen: %s`, msg._id)
      continue
    }
    seenMsgs[msg._id] = true

    const parent = messages[i - 1]

    if (!msg.parent) {
      if (parent) {
        log('modified parent of %s', msg._id.slice(0, 4))
        msg.parent = parent._id
      } else {
        log('root? %s', msg._id.slice(0, 4))
      }
    }

    tree[msg._id].depth = getMessageDepth(tree, msg.parent || '') + 1
    if (msg.parent) {
      const base = `${msg.parent.slice(0, 4)} <-- ${msg._id.slice(0, 4)}`
      const ancestor = tree[msg.parent]

      if (ancestor) {
        log(base)
        ancestor.children[msg._id] = true
      } else {
        log('%s: ancestor not found', base)
      }
    }
  }

  // for (const { msg } of Object.values(tree)) {
  //   if (!msg.parent) {
  //     log(`root? %s`, msg._id.slice(0, 4))
  //     continue
  //   }

  //   const parent = tree[msg.parent]
  //   if (!parent) continue
  //   log('assigned to %s: %s', parent.msg._id.slice(0, 4), msg._id.slice(0, 4))
  //   parent.children[msg._id] = true
  // }

  return { tree, root: messages[0]?._id || '' }
}

export function updateChatTreeNode(tree: ChatTree, msg: AppSchema.ChatMessage) {
  const next: ChatTree = { ...tree }

  next[msg._id] = {
    msg,
    children: {},
    depth: getMessageDepth(tree, msg.parent || '') + 1,
  }

  for (const { msg } of Object.values(next)) {
    if (!msg.parent) continue
    const parent = tree[msg.parent]
    if (!parent) continue
    parent.children[msg._id] = true
  }

  return next
}

export function removeChatTreeNodes(tree: ChatTree, ids: string[]) {
  const next = { ...tree }

  for (const id of ids) {
    const node = next[id]
    if (!node) continue

    const parent = node.msg.parent ? next[node.msg.parent] : null
    if (parent) {
      delete parent.children[id]

      for (const childId in node.children) {
        parent.children[childId] = true

        const child = next[childId]
        if (!child) continue

        child.msg.parent = node.msg.parent
      }
    }

    delete next[id]
  }

  return next
}

export function getChatDepths(tree: ChatTree) {
  const depths: ChatDepths = {}

  for (const [id, { depth }] of Object.entries(tree)) {
    if (!depths[depth]) {
      depths[depth] = []
    }

    depths[depth].push(id)
  }

  return depths
}

export function resolveChatPath(tree: ChatTree, leaf: string): AppSchema.ChatMessage[] {
  const messages: AppSchema.ChatMessage[] = []
  if (!leaf) return messages

  let curr = leaf
  while (true) {
    const node = tree[curr]
    if (!node) break

    messages.unshift(node.msg)
    if (!node.msg.parent) {
      console.log(`${node.msg._id.slice(0, 4)} no parent`)
      break
    }
    curr = node.msg.parent
  }

  return messages
}

export function getPathOptions(tree: ChatTree, nodeId: string) {
  const options: Array<{ id: string; depth: number }> = []
  const node = tree[nodeId]

  if (!node) {
    return options
  }

  const candidates = new Set<string>(Object.keys(tree))
  candidates.delete(nodeId)

  for (const [id, { msg, depth, children }] of Object.entries(tree)) {
    if (id === nodeId) continue

    if (!msg.parent) {
      candidates.delete(id)
      continue
    }

    if (depth < node.depth) {
      candidates.delete(id)
      continue
    }

    if (Object.keys(children).length > 0) {
      candidates.delete(id)
      continue
    }
  }

  options.push({ id: nodeId, depth: node.depth })

  for (const id of candidates.values()) {
    const candidate = tree[id]
    if (!candidate) continue
    options.push({ id, depth: candidate.depth })
  }

  return options
}

function getMessageDepth(tree: ChatTree, leaf: string) {
  const node = tree[leaf]

  if (!node) return -1
  const visited = new Set<string>([leaf])

  let depth = 0
  let curr = leaf

  while (true) {
    const node = tree[curr]
    if (!node) return depth
    if (!node.msg.parent) return depth

    if (visited.has(node.msg.parent)) {
      throw new Error(`Invalid chat tree: Circular reference detected (${node.msg.parent})`)
    }

    depth++
    visited.add(node.msg._id)

    curr = node.msg.parent
  }
}

export function sortAsc(l: Created, r: Created) {
  return l.createdAt === r.createdAt ? 0 : l.createdAt < r.createdAt ? -1 : 1
}
