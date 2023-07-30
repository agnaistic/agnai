import { formatCharacter } from './characters'
import { grammar } from './grammar'
import { PromptParts, fillPromptWithLines } from './prompt'
import { AppSchema, Memory } from '/common/types'
import peggy from 'peggy'
import { elapsedSince } from './util'
import { Encoder } from './tokenize'
import { v4 } from 'uuid'

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
  | 'impersonating'
  | 'system_prompt'
  | 'random'
  | 'roll'

type RepeatableHolder = Extract<
  Holder,
  'char' | 'user' | 'chat_age' | 'roll' | 'random' | 'idle_duration'
>

const repeatableHolders = new Set<RepeatableHolder>([
  'char',
  'user',
  'chat_age',
  'idle_duration',
  'random',
  'roll',
])

type IterableHolder = 'history' | 'bots'

type HistoryProp = 'i' | 'message' | 'dialogue' | 'name' | 'isuser' | 'isbot'
type BotsProp = 'i' | 'personality' | 'name'

export type TemplateOpts = {
  parts: Partial<PromptParts>
  chat: AppSchema.Chat

  char: AppSchema.Character
  replyAs: AppSchema.Character
  impersonate?: AppSchema.Character
  sender: AppSchema.Profile

  lines: string[]
  characters: Record<string, AppSchema.Character>
  lastMessage?: string

  chatEmbed?: Memory.UserEmbed<{ name: string }>[]
  userEmbed?: Memory.UserEmbed[]

  /** If present, history will be rendered last */
  limit?: {
    context: number
    encoder: Encoder
    output?: Record<string, string[]>
  }

  /**
   * Only allow repeatable placeholders. Excludes iterators, conditions, and prompt parts.
   */
  repeatable?: boolean
}

export function parseTemplate(template: string, opts: TemplateOpts) {
  if (opts.limit) {
    opts.limit.output = {}
  }

  if (opts.parts.systemPrompt) {
    opts.parts.systemPrompt = render(opts.parts.systemPrompt, opts)
  }

  if (opts.parts.ujb) {
    opts.parts.ujb = render(opts.parts.ujb, opts)
  }

  let output = render(template, opts)

  if (opts.limit && opts.limit.output) {
    for (const [id, lines] of Object.entries(opts.limit.output)) {
      const trimmed = fillPromptWithLines(
        opts.limit.encoder,
        opts.limit.context,
        output,
        lines
      ).reverse()
      output = output.replace(id, trimmed.join('\n'))
    }
  }

  return render(output, opts)
}

function render(template: string, opts: TemplateOpts) {
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

function renderNode(node: PNode, opts: TemplateOpts) {
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

function renderProp(node: CNode, opts: TemplateOpts, entity: unknown, i: number) {
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
        case 'i': {
          return i.toString()
        }

        case 'message': {
          const index = line.indexOf(':')
          return line.slice(index + 1).trim()
        }

        case 'name': {
          const index = line.indexOf(':')
          return line.slice(0, index)
        }

        case 'dialogue': {
          const index = line.indexOf(':')
          return line.slice(index + 1).trim()
        }

        case 'isbot':
        case 'isuser': {
          const index = line.indexOf(':')
          const name = line.slice(0, index)
          const sender = opts.impersonate?.name ?? opts.sender?.handle
          const match = name === sender
          return node.prop === 'isuser' ? match : !match
        }
      }
    }
  }
}

function renderCondition(node: ConditionNode, children: PNode[], opts: TemplateOpts) {
  if (opts.repeatable) return ''

  const value = getPlaceholder(node, opts)
  if (!value) return

  const output: string[] = []
  for (const child of children) {
    const result = renderNode(child, opts)
    if (result) output.push(result)
  }

  return output.join('')
}

function renderIterator(holder: IterableHolder, children: CNode[], opts: TemplateOpts) {
  if (opts.repeatable) return ''

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

  if (holder === 'history' && opts.limit) {
    const id = '__' + v4() + '__'
    opts.limit.output![id] = output
    return id
  }

  return output.join('\n')
}

function renderEntityCondition(nodes: CNode[], opts: TemplateOpts, entity: unknown, i: number) {
  let result = ''

  for (const node of nodes) {
    const res = renderProp(node, opts, entity, i)
    if (res) result += res.toString()
  }

  return result
}

function getPlaceholder(node: PlaceHolder | ConditionNode, opts: TemplateOpts) {
  if (opts.repeatable && !repeatableHolders.has(node.value as any)) return ''

  switch (node.value) {
    case 'char':
      return opts.replyAs.name

    case 'user':
      return opts.impersonate?.name || opts.sender?.handle || 'You'

    case 'example_dialogue':
      return opts.parts.sampleChat?.join('\n') || ''

    case 'scenario':
      return opts.parts.scenario || opts.chat.scenario || opts.char.scenario

    case 'memory':
      return opts.parts.memory || ''

    case 'impersonating':
      return opts.parts.impersonality || ''

    case 'personality':
      return opts.parts.persona

    case 'ujb':
      return opts.parts.ujb || ''

    case 'post':
      return opts.parts.post?.join('\n') || ''

    case 'history': {
      if (opts.limit) {
        const id = `__${v4()}__`
        opts.limit.output![id] = opts.lines
        return id
      }

      return opts.lines.join('\n')
    }

    case 'chat_age':
      return elapsedSince(opts.chat.createdAt)

    case 'idle_duration':
      return lastMessage(opts.lastMessage || '')

    case 'all_personalities':
      return opts.parts.allPersonas?.join('\n') || ''

    case 'chat_embed':
      return opts.parts.chatEmbeds?.join('\n') || ''

    case 'user_embed':
      return opts.parts.userEmbeds?.join('\n') || ''

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
