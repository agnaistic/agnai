import { formatCharacter } from './characters'
import { grammar } from './grammar'
import { PromptParts } from './prompt'
import { AppSchema } from '/srv/db/schema'
import peggy from 'peggy'
import { logger } from '/srv/logger'
import { elapsedSince } from './util'

const parser = peggy.generate(grammar.trim(), {
  error: (stage, msg, loc) => {
    logger.error({ loc, stage }, msg)
  },
})

type PNode =
  | { kind: 'placeholder'; value: Holder; pipes?: string[] }
  | { kind: 'if'; value: Holder; children: PNode[] }
  | { kind: 'each'; value: IterableHolder; children: CNode[] }
  | string

type CNode =
  | Exclude<PNode, { kind: 'each' }>
  | { kind: 'bot-prop'; prop: BotsProp }
  | { kind: 'history-prop'; prop: HistoryProp }
  | { kind: 'history-if'; prop: HistoryProp; children: CNode[] }
  | { kind: 'bot-if'; prop: BotsProp; children: CNode[] }

type Holder =
  | 'char'
  | 'user'
  | 'scenario'
  | 'personality'
  | 'example_dialogue'
  | 'history'
  | 'ujb'
  | 'post'
  | 'memory'
  | 'chat_age'
  | 'last_message'

type IterableHolder = 'history' | 'bots'

type HistoryProp = 'i' | 'message' | 'dialogue' | 'name' | 'isuser' | 'isbot'
type BotsProp = 'i' | 'personality' | 'name'

export type ParseOpts = {
  replyAs: AppSchema.Character
  members: AppSchema.Profile[]
  impersonate?: AppSchema.Character
  parts: PromptParts
  chat: AppSchema.Chat
  char: AppSchema.Character
  user: AppSchema.User
  settings?: Partial<AppSchema.GenSettings>
  lines: string[]
  characters: Record<string, AppSchema.Character>
  sender: AppSchema.Profile
  lastMessage?: string
}

export function parseTemplate(template: string, opts: ParseOpts) {
  try {
    const ast = parser.parse(template, {}) as PNode[]
    const output: string[] = []
    for (const parent of ast) {
      const result = renderNode(parent, opts)
      if (result) output.push(result)
    }
    return output.join('')
  } catch (err) {
    logger.error({ err }, 'Failed to parse')
    throw err
  }
}

function renderNode(node: PNode, opts: ParseOpts) {
  if (typeof node === 'string') {
    return node
  }

  switch (node.kind) {
    case 'placeholder': {
      return getPlaceholder(node.value, opts)
    }

    case 'each':
      return renderIterator(node.value, node.children, opts)

    case 'if':
      return renderCondition(node.value, node.children, opts)
  }
}

function renderProp(node: CNode, opts: ParseOpts, entity: unknown, i: number) {
  if (typeof node === 'string') return node

  switch (node.kind) {
    case 'bot-if':
    case 'bot-prop': {
      const bot = entity as AppSchema.Character
      switch (node.prop) {
        case 'i':
          return i.toString()

        case 'name':
          return bot.name

        case 'personality':
          return formatCharacter(
            bot.name,
            bot.persona,
            bot.persona.kind /* || opts.chat.overrides.kind */ // looks like the || operator's left hand side is always truthy - @malfoyslastname
          )
      }
    }

    case 'history-if':
    case 'history-prop': {
      const line = entity as string
      switch (node.prop) {
        case 'i':
          return i.toString()

        case 'message':
          return entity as string

        case 'name': {
          const index = line.indexOf(':')
          return line.slice(0, index)
        }

        case 'dialogue': {
          const index = line.indexOf(':')
          return line.slice(index + 1).trim()
        }

        case 'isbot':
        case 'isuser':
          const index = line.indexOf(':')
          const name = line.slice(0, index)
          const sender = opts.impersonate?.name ?? opts.sender.handle
          const match = name === sender
          return node.prop === 'isuser' ? match : !match
      }
    }
  }
}

function renderCondition(holder: Holder, children: PNode[], opts: ParseOpts) {
  const value = getPlaceholder(holder, opts)
  if (!value) return

  const output: string[] = []
  for (const child of children) {
    const result = renderNode(child, opts)
    if (result) output.push(result)
  }

  return output.join('')
}

function renderIterator(holder: IterableHolder, children: CNode[], opts: ParseOpts) {
  const output: string[] = []

  const entities =
    holder === 'bots'
      ? Object.values(opts.characters).filter((b) => !!b && b._id !== opts.replyAs._id)
      : opts.lines

  let i = 0
  for (const entity of entities) {
    let curr = ''
    for (const child of children) {
      if (typeof child === 'string') {
        curr += child
        continue
      }

      switch (child.kind) {
        case 'if':
        case 'placeholder': {
          const result = renderNode(child, opts)
          if (result) curr += result
          break
        }

        case 'bot-prop':
        case 'history-prop': {
          const result = renderProp(child, opts, entity, i)
          if (result) curr += result
          break
        }

        case 'bot-if':
        case 'history-if': {
          const prop = renderProp(child, opts, entity, i)
          if (!prop) break
          const result = renderEntityCondition(child.children, opts, entity, i)
          curr += result
          break
        }
      }
    }
    if (curr) output.push(curr)
    i++
  }

  return output.join('\n')
}

function renderEntityCondition(nodes: CNode[], opts: ParseOpts, entity: unknown, i: number) {
  let result = ''

  for (const node of nodes) {
    const res = renderProp(node, opts, entity, i)
    if (res) result += res.toString()
  }

  return result
}

function getPlaceholder(value: Holder, opts: ParseOpts) {
  switch (value) {
    case 'char':
      return opts.replyAs.name

    case 'user':
      return (
        opts.impersonate?.name ||
        opts.members.find((m) => m.userId === opts.user._id)?.handle ||
        'You'
      )

    case 'example_dialogue':
      return opts.parts.sampleChat?.join('\n') || ''

    case 'scenario':
      return opts.parts.scenario || opts.chat.scenario || opts.char.scenario

    case 'memory':
      return opts.parts.memory || ''

    case 'personality':
      return opts.parts.persona

    case 'ujb':
      return opts.parts.ujb || ''

    case 'post':
      return opts.parts.post.join('\n')

    case 'history':
      return opts.lines.join('\n')

    case 'chat_age':
      return elapsedSince(opts.chat.createdAt)

    case 'last_message':
      return lastMessage(opts.lastMessage || '')
  }
}

function lastMessage(value: string) {
  if (!value) return 'unknown'

  const date = new Date(value)
  if (isNaN(date.valueOf())) return 'unknown'
  return elapsedSince(date)
}
