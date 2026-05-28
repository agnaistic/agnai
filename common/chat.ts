import { debug } from './debug'
import { AppSchema } from './types'
import { PresetParser } from './types/presets'

type Created = { _id: string; createdAt: string }

export type ChatTree = Record<string, ChatNode>

export type ChatNode = {
  depth: number
  msg: AppSchema.ChatMessage
  children: Record<string, true>
}

export type ChatDepths = Record<number, string[]>

export function runPresetParsers(
  parsers: PresetParser[],
  message: string,
  opts?: { preset?: boolean }
) {
  let current = message || ''

  for (const parser of parsers) {
    if (!parser.text?.trim()) continue
    switch (parser.type) {
      case 'remove-prompt':
      case 'remove': {
        if (parser.type === 'remove-prompt' && !opts?.preset) continue
        const remove = parser.text.replace(/(?<!\\)\\n/g, '\n').replaceAll('\\\\n', '\\n')
        current = current.split(remove).join('')
        continue
      }

      case 'replace-prompt':
      case 'replace': {
        if (parser.type === 'replace-prompt' && !opts?.preset) continue
        const from = parser.text.replace(/(?<!\\)\\n/g, '\n').replaceAll('\\\\n', '\\n')
        const to = (parser.to || '').replace(/(?<!\\)\\n/g, '\n').replaceAll('\\\\n', '\\n')
        current = current.split(from).join(to)
        continue
      }
    }
  }

  return current
}

export type QuickChatNode = {
  _id: string
  age: string
  childCount: number
  parent?: string
  children: Record<string, true>
}

export type QuickChatGraph = {
  tree: Record<string, QuickChatNode>
  orphans: Array<{ _id: string; age: string; parent?: string }>
  path: Array<{ _id: string; parent?: string }>
}

export function toQuickGraph(
  messages: Array<{ _id: string; createdAt: string; parent?: string }>,
  currentLeaf?: string
) {
  const tree: QuickChatGraph['tree'] = {}
  const orphans: QuickChatGraph['orphans'] = []

  for (const msg of messages) {
    tree[msg._id] = {
      _id: msg._id,
      age: msg.createdAt,
      parent: msg.parent,
      children: {},
      childCount: 0,
    }
  }

  let index = -1
  for (const msg of messages) {
    index++

    // Handle chats before graphs existed
    if (!msg.parent) {
      // Ignore root message, always has no parent
      if (index === 0) continue
      const parentSrc = messages[index - 1]
      const parent = tree[parentSrc?._id]
      if (!parent) {
        orphans.push({ _id: msg._id, age: msg.createdAt, parent: msg.parent })
        continue
      }

      tree[msg._id].parent = parent._id
      parent.childCount++
      parent.children[msg._id] = true
      continue
    }

    const parent = tree[msg.parent]
    if (!parent) {
      orphans.push({ _id: msg._id, age: msg.createdAt, parent: msg.parent })
      continue
    }

    parent.childCount++
    parent.children[msg._id] = true
  }

  const path: QuickChatGraph['path'] = []
  if (currentLeaf) {
    let current = currentLeaf
    while (true) {
      const msg = tree[current]
      if (!msg) break

      path.unshift({ _id: msg._id, parent: msg.parent })
      if (!msg.parent) break
      current = msg.parent
    }
  }

  return { tree, orphans, path }
}

export function getDeletionChanges(graph: QuickChatGraph, deleteIds: string[]) {
  const deleteSet = new Set(deleteIds)
  const method = deleteIds.some((id) => graph.tree[id]?.childCount === 0)
    ? 'tail'
    : ('middle' as const)
  const deletes = deleteIds.map((id) => graph.tree[id]).sort((l, r) => l.age.localeCompare(r.age))
  const head = deletes[0]
  const tail = deletes.slice(-1)[0]

  let nextLeafId = method === 'tail' ? head?.parent || '' : undefined
  let parents =
    method === 'middle'
      ? { ids: tail ? Object.keys(tail.children) : [], parentId: head.parent || '' }
      : undefined

  const leaf = graph.tree[nextLeafId || '']

  // If the next leaf is invalid (we expect one, but it doesn't exist) then what?
  // For now, we'll walk-up the path until we get a node that exists.
  if (method === 'tail' && nextLeafId && !leaf) {
    for (const node of graph.path.slice().reverse()) {
      if (deleteSet.has(node._id)) continue
      nextLeafId = node._id
    }
  }

  const updates = {
    chat: nextLeafId ? { treeLeafId: nextLeafId } : {},
    messages: parents ? parents.ids.map((id) => ({ _id: id, parent: parents?.parentId })) : [],
  }

  return { method, deletes, head, tail, nextLeafId, parents, updates }
}

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
        // log(base)
        ancestor.children[msg._id] = true
      } else {
        log('%s: ancestor not found', base)
      }
    }
  }

  return { tree, root: messages[0]?._id || '' }
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
