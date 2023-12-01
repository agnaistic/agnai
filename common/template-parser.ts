import { formatCharacter } from './characters'
import { grammar } from './grammar'
import { PromptParts, fillPromptWithLines } from './prompt'
import { AppSchema, Memory, TokenCounter } from '/common/types'
import peggy from 'peggy'
import { elapsedSince } from './util'
import { v4 } from 'uuid'

const parser = peggy.generate(grammar.trim(), {
  error: (stage, msg, loc) => {
    console.error({ loc, stage }, msg)
  },
})

type PNode = PlaceHolder | ConditionNode | IteratorNode | InsertNode | string

type PlaceHolder = { kind: 'placeholder'; value: Holder; values?: any; pipes?: string[] }
type ConditionNode = { kind: 'if'; value: Holder; values?: any; children: PNode[] }
type IteratorNode = { kind: 'each'; value: IterableHolder; children: CNode[] }
type InsertNode = { kind: 'history-insert'; values: number; children: PNode[] }

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
  continue?: boolean
  parts?: Partial<PromptParts>
  chat: AppSchema.Chat

  char: AppSchema.Character
  replyAs?: AppSchema.Character
  impersonate?: AppSchema.Character
  sender: AppSchema.Profile

  lines?: string[]
  characters?: Record<string, AppSchema.Character>
  lastMessage?: string

  chatEmbed?: Memory.UserEmbed<{ name: string }>[]
  userEmbed?: Memory.UserEmbed[]

  /** If present, history will be rendered last */
  limit?: {
    context: number
    encoder: TokenCounter
    output?: Record<string, string[]>
  }

  /**
   * Only allow repeatable placeholders. Excludes iterators, conditions, and prompt parts.
   */
  repeatable?: boolean
  inserts?: Map<number, string>
}

/**
 * This function also returns inserts because Chat and Claude discard the
 * parsed string and use the inserts for their own prompt builders
 */
export async function parseTemplate(
  template: string,
  opts: TemplateOpts
): Promise<{ parsed: string; inserts: Map<number, string>; length?: number }> {
  if (opts.limit) {
    opts.limit.output = {}
  }

  const parts = opts.parts || {}

  if (parts.systemPrompt) {
    parts.systemPrompt = render(parts.systemPrompt, opts)
  }

  if (parts.ujb) {
    parts.ujb = render(parts.ujb, opts)
  }

  const ast = parser.parse(template, {}) as PNode[]
  readInserts(template, opts, ast)
  let output = render(template, opts, ast)

  if (opts.limit && opts.limit.output) {
    // const lastIndex = Object.keys(opts.limit.output).reduce((prev, curr) => {
    //   const index = output.lastIndexOf(curr) + curr.length
    //   return index > prev ? index : prev
    // }, -1)

    // if (lastIndex > -1 && opts.continue) {
    //   output = output.slice(0, lastIndex)
    // }

    for (const [id, lines] of Object.entries(opts.limit.output)) {
      const trimmed = (
        await fillPromptWithLines(
          opts.limit.encoder,
          opts.limit.context,
          output,
          lines,
          opts.inserts
        )
      ).reverse()
      output = output.replace(id, trimmed.join('\n'))
    }
  }

  const result = render(output, opts).replace(/\r\n/g, '\n').replace(/\n\n+/g, '\n\n').trimStart()
  return {
    parsed: result,
    inserts: opts.inserts ?? new Map(),
    length: await opts.limit?.encoder?.(result),
  }
}

function readInserts(template: string, opts: TemplateOpts, existingAst?: PNode[]): void {
  if (opts.inserts) return
  const ast = existingAst ?? (parser.parse(template, {}) as PNode[])

  const inserts = ast.filter(
    (node) => typeof node !== 'string' && node.kind === 'history-insert'
  ) as InsertNode[]

  opts.inserts = new Map()
  if (opts.char.insert) {
    opts.inserts.set(opts.char.insert.depth, opts.char.insert.prompt)
  }
  for (const insert of inserts) {
    const oldInsert = opts.inserts.get(insert.values)
    opts.inserts.set(
      insert.values,
      // If multiple inserts are in the same depth, we want to combine them
      (oldInsert ? oldInsert + '\n' : '') + renderNodes(insert.children, opts)
    )
  }
}

function render(template: string, opts: TemplateOpts, existingAst?: PNode[]) {
  try {
    const orig = existingAst ?? (parser.parse(template, {}) as PNode[])
    const ast: PNode[] = []

    /**
     * When condition nodes are at the beginning a new line then the linebreak should
     * only be rendered if the condition is rendered
     * We will move the line break to the beginning of the condition children
     */
    for (let i = 0; i < orig.length; i++) {
      const node = orig[i]
      if (typeof node !== 'string') {
        ast.push(node)
        continue
      }

      const next = orig[i + 1]
      const prev = orig[i - 1]

      if (node === '\n' && isEnclosingNode(next)) {
        next.children.unshift('\n')
        continue
      }

      if (node === '\n' && isEnclosingNode(prev)) {
        prev.children.push('\n')
        continue
      }

      ast.push(node)
    }

    const output: string[] = []

    for (let i = 0; i < ast.length; i++) {
      const parent = ast[i]

      const result = renderNode(parent, opts)

      if (result) output.push(result)
    }
    return output.join('').replace(/\n\n+/g, '\n\n')
  } catch (err) {
    console.error({ err }, 'Failed to parse')
    throw err
  }
}

function renderNodes(nodes: PNode[], opts: TemplateOpts) {
  const output: string[] = []
  for (const node of nodes) {
    const text = renderNode(node, opts)
    if (text) output.push(text)
  }
  return output.join('')
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
  let isHistory = holder === 'history'

  const output: string[] = []

  const entities =
    holder === 'bots'
      ? Object.values(opts.characters || {}).filter((b) => {
          if (!b) return false
          if (b._id === (opts.replyAs || opts.char)._id) return false
          if (b.deletedAt) return false
          if (b._id.startsWith('temp-') && b.favorite === false) return false
          return true
        })
      : opts.lines || []

  let i = 0
  for (const entity of entities) {
    let curr = ''
    for (const child of children) {
      if (typeof child === 'string') {
        curr += child
        continue
      }

      switch (child.kind) {
        case 'if': {
          const condition = getPlaceholder(child, opts)
          if (!condition) break

          const result = renderNode(child, opts)
          if (result) curr += result
          break
        }
        case 'placeholder': {
          const result = renderNode(child, opts)
          if (result) curr += result
          break
        }

        case 'bot-prop':
        case 'history-prop': {
          if (
            child.prop === 'personality' ||
            child.prop === 'message' ||
            child.prop === 'dialogue'
          ) {
            isHistory = true
          }
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

  if (isHistory && opts.limit) {
    const id = '__' + v4() + '__'
    opts.limit.output![id] = output
    return id
  }

  return isHistory ? output.join('\n') : output.join('')
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
      return (opts.replyAs || opts.char).name || ''

    case 'user':
      return opts.impersonate?.name || opts.sender?.handle || 'You'

    case 'example_dialogue':
      return opts.parts?.sampleChat?.join('\n') || ''

    case 'scenario':
      return opts.parts?.scenario || opts.chat.scenario || opts.char.scenario || ''

    case 'memory':
      return opts.parts?.memory || ''

    case 'impersonating':
      return opts.parts?.impersonality || ''

    case 'personality':
      return opts.parts?.persona || ''

    case 'ujb':
      return opts.parts?.ujb || ''

    case 'post': {
      return opts.parts?.post?.join('\n') || ''
    }

    case 'history': {
      if (opts.limit) {
        const id = `__${v4()}__`
        opts.limit.output![id] = opts.lines || []
        return id
      }

      return opts.lines?.join('\n') || ''
    }

    case 'chat_age':
      return elapsedSince(opts.chat.createdAt)

    case 'idle_duration':
      return lastMessage(opts.lastMessage || '')

    case 'all_personalities':
      return opts.parts?.allPersonas?.join('\n') || ''

    case 'chat_embed':
      return opts.parts?.chatEmbeds?.join('\n') || ''

    case 'user_embed':
      return opts.parts?.userEmbeds?.join('\n') || ''

    case 'system_prompt':
      return opts.parts?.systemPrompt || ''

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

function isEnclosingNode(node: any): node is ConditionNode | IteratorNode {
  if (!node || typeof node === 'string') return false
  return node.kind === 'if'
}
