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
  const baseEndTokens = [`${char.name}:`, `${char.name} :`, 'END_OF_DIALOG', '<END>', '\n\n']

  for (const member of members) {
    baseEndTokens.push(`${member.handle}:`, `${member.handle} :`)
  }

  let index = -1
  const trimmed = baseEndTokens.concat(...endTokens).reduce((prev, endToken) => {
    const idx = generated.indexOf(endToken)
    if (idx === -1) return prev
    const text = generated.slice(0, index)
    if (index === -1) return text
    return idx < index ? text : prev
  }, '')

  if (index === -1) {
    return sanitise(generated)
  }

  return sanitise(trimmed)
}

export function joinParts(parts: string[]) {
  return parts.map(sanitise).join(' ').trim()
}

export function sanitise(generated: string) {
  return generated.replace(/\s+/g, ' ').trim()
}
