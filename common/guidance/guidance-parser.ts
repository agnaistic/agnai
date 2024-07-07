import peggy from 'peggy'
import { grammar } from './grammar'
import { store } from '/srv/db'

type PNode = VarNode | TextNode

type TextNode = { kind: 'text'; text: string }
type VarNode = {
  kind: 'variable'
  name: string
  pipe?: Pipe
  tokens?: number
  temp?: number
  stop?: string[]
}

type Pipe = { type: 'sentence' } | { type: 'words'; value: number }

const parser = peggy.generate(grammar.trim(), {
  error: (stage, msg, loc) => {
    console.error({ loc, stage }, msg)
  },
})

export type GuidanceParams = { prompt: string; tokens?: number; stop?: string[] }

export type GuidanceInferncer = (params: GuidanceParams) => Promise<string>

export type GuidanceOpts = {
  infer: GuidanceInferncer

  /**
   * Will replace {{holders}} with their corresponding values
   * E.g. {{history}} would be replaced with { history: string }
   */
  placeholders?: Record<string, string>

  /**
   * Specifically for guidance chains. The values from previous guidance calls
   */
  previous?: Record<string, string>

  /** Specific variables to fulfill - All preceeding variables must have values */
  reguidance?: string[]
}

export function guidanceParse(template: string): PNode[] {
  const ast = parser.parse(template, {})
  return ast
}

export async function runGuidance<T extends Record<string, string> = Record<string, string>>(
  template: string,
  opts: GuidanceOpts
): Promise<{ result: string; values: T }> {
  const { infer, placeholders } = opts
  const nodes = guidanceParse(inject(template, placeholders))

  const srv = await store.admin.getServerConfiguration()
  const counts = calculateNodeCounts(nodes)

  if (srv.maxGuidanceTokens && counts.tokens > srv.maxGuidanceTokens) {
    throw new Error(`Cannot run guidance: Template is requesting too many tokens (>1000)`)
  }

  if (srv.maxGuidanceVariables && counts.vars > srv.maxGuidanceVariables) {
    throw new Error(`Cannot run guidance: Template requests too many variables (>15)`)
  }

  let prompt = ''
  let values: any = {}
  const previous: any = opts.previous || {}

  const reruns = new Set(opts.reguidance || [])

  const done = new Set<string>()

  for (const node of nodes) {
    if (opts.reguidance && reruns.size === 0) {
      break
    }

    switch (node.kind) {
      case 'text':
        prompt += node.text
        continue

      case 'variable': {
        const name = node.name.toLowerCase()

        const isRerun = opts.reguidance?.includes(name)
        if (opts.reguidance && !isRerun) {
          const prev = previous[name]
          if (prev === undefined) {
            throw new Error(`Cannot re-run guidance: Missing preceeding value "${name}"`)
          }
        }

        if (!isRerun && previous[name]) {
          const value = previous[name]
          if (!opts.reguidance) values[name] = value
          prompt += value
          continue
        }

        const results = await infer({ prompt, tokens: node.tokens, stop: node.stop })
        const result = results.trim()
        const value = handlePipe(result, node.pipe)
        done.add(name)
        prompt += value
        values[name] = value

        reruns.delete(name)

        /** If all re-guidance values have been fulfilled, return  */
        if (opts.reguidance && reruns.size === 0) {
          break
        }

        continue
      }
    }
  }

  return { result: prompt, values: { ...previous, ...values } }
}

export function calculateGuidanceCounts(template: string, placeholders?: Record<string, string>) {
  const nodes = guidanceParse(inject(template, placeholders))
  return calculateNodeCounts(nodes)
}

function calculateNodeCounts(nodes: PNode[]) {
  const requestedTokens = nodes.reduce(
    (count, node) => {
      if (node.kind !== 'variable') return count

      return {
        tokens: (node.tokens || 200) + count.tokens,
        vars: count.vars + 1,
      }
    },
    { tokens: 0, vars: 0 }
  )

  return requestedTokens
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
      const [first] = value.split('\n')
      return first
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
