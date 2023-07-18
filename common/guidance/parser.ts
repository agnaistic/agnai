import peggy from 'peggy'
import { grammar } from './grammar'

type PNode = VarNode | TextNode

type TextNode = { kind: 'text'; text: string }
type VarNode = { kind: 'variable'; name: string }

const parser = peggy.generate(grammar.trim(), {
  error: (stage, msg, loc) => {
    console.error({ loc, stage }, msg)
  },
})

export function guidanceParse(template: string): PNode[] {
  const ast = parser.parse(template, {})
  return ast
}

export async function runGuidance<T extends Record<string, string> = Record<string, string>>(
  template: string,
  infer: (text: string) => Promise<string>
): Promise<{ result: string; values: T }> {
  const nodes = guidanceParse(template)

  let prompt = ''
  let values: any = {}

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

        const results = await infer(prompt.trim())
        const [result] = results.trim().split('\n')
        prompt += result
        values[name] = result
        continue
      }
    }
  }

  return { result: prompt, values }
}
