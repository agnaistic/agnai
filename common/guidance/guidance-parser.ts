import peggy from 'peggy'
import { grammar } from './grammar'

type PNode = VarNode | TextNode

type TextNode = { kind: 'text'; text: string }
type VarNode = { kind: 'variable'; name: string; pipe?: Pipe; tokens?: number; temp?: number }

type Pipe = { type: 'sentence' } | { type: 'words'; value: number }

const parser = peggy.generate(grammar.trim(), {
  error: (stage, msg, loc) => {
    console.error({ loc, stage }, msg)
  },
})

type GuidanceOpts = {
  infer: (prompt: string, maxTokens?: number) => Promise<string>

  /**
   * Will replace {{holders}} with their corresponding values
   * E.g. {{history}} would be replaced with { history: string }
   */
  placeholders?: Record<string, string>

  /**
   * Specifically for guidance chains. The values from previous guidance calls
   */
  previous?: Record<string, string>
}

export function guidanceParse(template: string): PNode[] {
  const ast = parser.parse(template, {})
  return ast
}

export async function rerunGuidanceValues<
  T extends Record<string, string> = Record<string, string>
>(template: string, rerun: string[], opts: GuidanceOpts) {
  const nodes = guidanceParse(inject(template, opts.placeholders))
  const values = opts.previous || {}

  for (const name of rerun) {
    let found = false
    for (const node of nodes) {
      if (node.kind === 'variable' && node.name === name) {
        found = true
        break
      }
    }

    if (!found)
      throw new Error(`Cannot re-run guidance: Requested variable "${name}" is not in template`)
  }

  const done = new Set<string>()

  let prompt = ''
  for (const node of nodes) {
    switch (node.kind) {
      case 'text':
        prompt += node.text
        continue

      case 'variable': {
        const prev = values[node.name]
        if (!rerun.includes(node.name)) {
          if (prev === undefined) {
            throw new Error(`Cannot re-run guidance: Missing previous value "${node.name}"`)
          }
          prompt += prev
          continue
        }

        const results = await opts.infer(prompt.trim(), node.tokens)
        const value = handlePipe(results.trim(), node.pipe)
        values[node.name] = value
        done.add(node.name)

        if (done.size === rerun.length) {
          return { values: values as T }
        }

        continue
      }
    }
  }

  return { values: values as T }
}

export async function runGuidanceChain<T extends Record<string, string> = Record<string, string>>(
  templates: string[],
  opts: GuidanceOpts
) {
  const { placeholders, previous, infer } = opts
  const values: any = Object.assign({}, previous)

  for (const template of templates) {
    const injected = inject(template, placeholders)
    const result = await runGuidance(injected, { infer, previous: values })
    Object.assign(values, result.values)
  }

  return { values: values as T }
}

export async function runGuidance<T extends Record<string, string> = Record<string, string>>(
  template: string,
  opts: GuidanceOpts
): Promise<{ result: string; values: T }> {
  const { previous, infer, placeholders } = opts
  const nodes = guidanceParse(inject(template, placeholders))

  let prompt = ''
  let values: any = Object.assign({}, previous)

  for (const node of nodes) {
    switch (node.kind) {
      case 'text':
        prompt += node.text
        continue

      case 'variable': {
        const name = node.name.toLowerCase()
        if (values[name]) {
          prompt += values[name]
          continue
        }

        const results = await infer(prompt.trim(), node.tokens)
        const result = results.trim()
        const value = handlePipe(result, node.pipe)
        prompt += value
        values[name] = value
        continue
      }
    }
  }

  return { result: prompt, values }
}

export async function runStepGuidance<T extends Record<string, string> = Record<string, string>>(
  template: string,
  infer: (text: string) => Promise<string>
) {
  const nodes = guidanceParse(template)
  let currentNode = 0

  let prompt = ''
  const values: any = {}
  const ordered: Array<{ key: string; value: string; start: number }> = []

  const next = async () => {
    const start = currentNode
    for (let i = currentNode; i < nodes.length; i++) {
      currentNode = i
      const node = nodes[i]
      switch (node.kind) {
        case 'text':
          prompt += node.text
          continue

        case 'variable': {
          const name = node.name.toLowerCase()
          if (values[name]) {
            prompt += values[name]
            continue
          }

          const results = await infer(prompt.trim())
          const result = results.trim()
          const value = handlePipe(result, node.pipe)
          prompt += value
          values[name] = value
          ordered.push({ key: name, value, start })
          continue
        }
      }
    }

    return { prompt, values: values as Partial<T>, ordered, done: currentNode >= nodes.length - 1 }
  }

  const retry = async () => {
    const last = ordered.slice(-1)[0]
    if (!last || currentNode === 0) {
      return next()
    }

    ordered.splice(ordered.length - 1, 1)
    delete values[last.key]
    currentNode = last.start

    return next()
  }

  return { next, retry }
}

function inject(template: string, placeholders?: Record<string, string>) {
  if (!placeholders) return template

  for (const [key, value] of Object.entries(placeholders)) {
    const re = new RegExp(`{{${key}}}`, 'gi')
    template = template.replace(re, value)
  }

  return template
}

function handlePipe(value: string, pipe?: Pipe) {
  if (!pipe) return value

  switch (pipe.type) {
    case 'sentence': {
      const [first] = value.split('.')
      return first + '.'
    }

    case 'words': {
      const [first] = value.trim().split('\n')
      const words = first
        .replace(/\n/g, ' ')
        .split(' ')
        .slice(0, pipe.value)
        .join(' ')
        .replace(/\./gi, '')
      return words
    }
  }

  return value
}
