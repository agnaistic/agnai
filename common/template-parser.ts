import { formatCharacter } from './characters'
import { grammar } from './grammar'
import { PromptParts } from './prompt'
import { AppSchema, Memory } from '/common/types'
import peggy from 'peggy'
import { elapsedSince } from './util'

const parser = peggy.generate(grammar.trim(), {
  error: (stage, msg, loc) => {
    console.error({ loc, stage }, msg)
  },
})

type PNode = PlaceHolder | ConditionNode | IteratorNode | string

type PlaceHolder = { kind: 'placeholder'; value: Holder; values?: any; pipes?: string[] }
type ConditionNode = { kind: 'if'; value: Holder; values?: any; children: PNode[] }
type IteratorNode = { kind: 'each'; value: IterableHolder; children: CNode[] }

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
  | 'idle_duration'
  | 'all_personalities'
  | 'chat_embed'
  | 'user_embed'
  | 'system_prompt'
  | 'random'
  | 'roll'

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
  chatEmbed?: Memory.UserEmbed<{ name: string }>[]
  userEmbed?: Memory.UserEmbed[]
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
    console.error({ err }, 'Failed to parse')
    throw err
  }
}

function renderNode(node: PNode, opts: ParseOpts) {
  if (typeof node === 'string') {
    return node
  }

  switch (node.kind) {
    case 'placeholder': {
      return getPlaceholder(node, opts)
    }

    case 'each':
      return renderIterator(node.value, node.children, opts)

    case 'if':
      return renderCondition(node, node.children, opts)
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

function renderCondition(node: ConditionNode, children: PNode[], opts: ParseOpts) {
  const value = getPlaceholder(node, opts)
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
    holder === 'bots' ? Object.values(opts.characters).filter((b) => !!b && b._id !== opts.replyAs._id) : opts.lines

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

function getPlaceholder(node: PlaceHolder | ConditionNode, opts: ParseOpts) {
  switch (node.value) {
    case 'char':
      return opts.replyAs.name

    case 'user':
      return opts.impersonate?.name || opts.members.find((m) => m.userId === opts.user._id)?.handle || 'You'

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

    case 'idle_duration':
      return lastMessage(opts.lastMessage || '')

    case 'all_personalities':
      return opts.parts.allPersonas?.join('\n') || ''

    case 'chat_embed':
      return opts.parts.chatEmbeds.join('\n') || ''

    case 'user_embed':
      return opts.parts.userEmbeds.join('\n') || ''

    case 'system_prompt':
      return opts.parts.systemPrompt || ''

    case 'random': {
      const values = node.values as string[]
      const rand = Math.random() * values.length
      return values[Math.floor(rand)]
    }

    case 'roll': {
      const max = +node.values
      const rand = Math.ceil(Math.random() * max)
      return rand.toString()
    }
  }
}

function lastMessage(value: string) {
  if (!value) return 'unknown'

  const date = new Date(value)
  if (isNaN(date.valueOf())) return 'unknown'
  return elapsedSince(date)
}
