import { Response } from 'express'
import { logger } from '../../logger'
import { GenerateOptions, generateResponse } from '../adapter/generate'

export async function streamMessage(opts: GenerateOptions, res: Response) {
  const stream = await generateResponse(opts).catch((err: Error) => err)

  if (stream instanceof Error) {
    res.status(500).send({ message: stream.message })
    return
  }

  let generated = ''

  for await (const msg of stream) {
    if (typeof msg !== 'string') {
      res.status(500)
      res.write(JSON.stringify(msg))
      res.send()
      return
    }

    generated = msg
    res.write(generated)
    res.write('\n\n')
  }

  return generated
}

/**
 * A single response can contain multiple end tokens
 *
 * Find the first occurrence of an end token then return the text preceding it
 */
export function trimResponse(generated: string, endTokens: string[]) {
  const trimmed = endTokens.reduce(
    (prev, curr) => {
      const index = generated.indexOf(curr)
      if (index === -1) return prev
      const text = generated.slice(0, index)
      if (prev.index === -1) return { index, response: text }
      return index < prev.index ? { index, response: text } : prev
    },
    { index: -1, response: '' }
  )

  if (trimmed.index === -1) return
  return trimmed
}

export function joinParts(parts: string[]) {
  return parts.map(sanitise).join(' ')
}

function sanitise(generated: string) {
  return generated.replace(/\s+/g, ' ').trim()
}
