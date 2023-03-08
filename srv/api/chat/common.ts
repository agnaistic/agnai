import { AppSchema } from '../../db/schema'

/**
 * A single response can contain multiple end tokens
 *
 * Find the first occurrence of an end token then return the text preceding it
 */
export function trimResponse(
  generated: string,
  char: AppSchema.Character,
  members: AppSchema.Profile[],
  endTokens: string[]
) {
  const baseEndTokens = [`${char.name}:`, `${char.name} :`, 'END_OF_DIALOG', '<END>']

  for (const member of members) {
    baseEndTokens.push(`${member.handle}:`, `${member.handle} :`)
  }

  const trimmed = baseEndTokens.concat(...endTokens).reduce(
    (prev, endToken) => {
      const index = generated.indexOf(endToken)
      if (index === -1) return prev
      const text = generated.slice(0, index).trim()
      if (prev.index === -1) return { index, response: text }
      return index < prev.index ? { index, response: text } : prev
    },
    { index: -1, response: '' }
  )

  if (trimmed.index === -1) {
    return { index: -1, response: sanitise(generated) }
  }

  return trimmed
}

export function joinParts(parts: string[]) {
  return parts.map(sanitise).join(' ').trim()
}

export function sanitise(generated: string) {
  return generated.replace(/\s+/g, ' ').trim()
}
