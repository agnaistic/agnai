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
          const [result] = results.trim().split('\n')
          prompt += result
          values[name] = result
          ordered.push({ key: name, value: result, start })
          continue
        }
      }
    }

    return { prompt, values, ordered, done: currentNode >= nodes.length - 1 }
  }

  const retry = async () => {
    ;[].splice
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
