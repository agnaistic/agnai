import peggy from 'peggy'
import { grammar } from './grammar'

export type GuidanceNode = VarNode | TextNode

type TextNode = { kind: 'text'; text: string }

type VarNode = {
  kind: 'variable'
  name: string
  pipe?: Pipe
  tokens?: number
  temp?: number
  stop?: string[]
  options?: string
} & VarType

type VarType =
  | { type: 'number'; min?: number; max?: number }
  | { type: 'boolean'; options: 'boolean' }
  | { type: 'options'; options: string }
  | { type: 'random'; options: string }
  | { type: 'string' }

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

export function parseTemplateV2(template: string) {
  const ast = parser.parse(template, {}) as GuidanceNode[]

  for (const node of ast) {
    if (node.kind !== 'variable') continue

    if (node.type === 'number') {
      // if (!node.stop) throw new Error(`Number ranges must contain a stop character (E.g. stop=,)`)
      if (node.min !== undefined && node.max !== undefined && node.min >= node.max) {
        throw new Error(`Invalid number range provided - Min is above max (Variable: ${node.name})`)
      }
    }
  }

  const placeholders: string[] = []

  const matches = template.match(/{{[a-zA-Z0-9_-]+}}/g)
  if (!matches) return { ast, placeholders }

  for (const match of matches) {
    const name = match.replace(/({|}| )/g, '')
    placeholders.push(name)
  }

  return { ast, placeholders }
}
