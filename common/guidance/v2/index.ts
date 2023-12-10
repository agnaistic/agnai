import peggy from 'peggy'
import { grammar } from './grammar'

type PNode = VarNode | TextNode

type TextNode = { kind: 'text'; text: string }

type VarNode = {
  kind: 'variable'
  name: string
  pipe?: Pipe
  tokens?: number
  temp?: number
  stop?: string[]
  num?: { min?: number; max?: number }
  boolean?: boolean

  options?: string
  random?: string
}

type Pipe = { type: 'sentence' } | { type: 'words'; value: number }

const parser = peggy.generate(grammar.trim(), {
  error: (stage, msg, loc) => {
    console.error({ loc, stage }, msg)
  },
})

/**
 * This is used for template validation only
 * This cannot be used for guidance yet
 */

export function parseTemplateV2(template: string): PNode[] {
  const ast = parser.parse(template, {}) as PNode[]

  for (const node of ast) {
    if (node.kind !== 'variable') continue

    if (node.num) {
      // if (!node.stop) throw new Error(`Number ranges must contain a stop character (E.g. stop=,)`)
      if (
        node.num.min !== undefined &&
        node.num.max !== undefined &&
        node.num.min >= node.num.max
      ) {
        throw new Error(`Invalid number range provided - Min is above max (Variable: ${node.name})`)
      }
    }
  }
  return ast
}
