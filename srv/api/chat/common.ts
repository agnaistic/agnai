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
  endTokens: string[] = []
) {
  const allEndTokens = getEndTokens(char, members)

  let index = -1
  const trimmed = allEndTokens.concat(...endTokens).reduce((prev, endToken) => {
    const idx = generated.indexOf(endToken)

    if (idx === -1) return prev

    const text = generated.slice(0, idx)
    if (index === -1 || idx < index) {
      index = idx
      return text
    }

    return prev
  }, '')

  if (index === -1) {
    return sanitise(generated)
  }

  return sanitise(trimmed)
}

export function trimResponseV2(
  generated: string,
  char: AppSchema.Character,
  members: AppSchema.Profile[],
  endTokens: string[] = []
) {
  const allEndTokens = getEndTokens(null, members)

  generated = generated.split(`${char.name} :`).join(`${char.name}:`)

  for (const member of members) {
    if (!member.handle) continue
    generated = generated.split(`${member.handle} :`).join(`${member.handle}:`)
  }

  let index = -1
  let trimmed = allEndTokens.concat(...endTokens).reduce((prev, endToken) => {
    const idx = generated.indexOf(endToken)

    if (idx === -1) return prev

    const text = generated.slice(0, idx)
    if (index === -1 || idx < index) {
      index = idx
      return text
    }

    return prev
  }, '')

  if (index === -1) {
    return sanitise(generated.split(`${char.name}:`).join(''))
  }

  return sanitise(trimmed.split(`${char.name}:`).join(''))
}

export function getEndTokens(
  char: AppSchema.Character | null,
  members: AppSchema.Profile[],
  endTokens: string[] = []
) {
  const baseEndTokens = ['END_OF_DIALOG', '<END>', '\n\n'].concat(endTokens)

  if (char) {
    baseEndTokens.push(`${char.name}:`, `${char.name} :`)
  }

  for (const member of members) {
    baseEndTokens.push(`${member.handle}:`, `${member.handle} :`)
  }

  const uniqueTokens = Array.from(new Set(baseEndTokens))
  return uniqueTokens
}

export function joinParts(parts: string[]) {
  return parts.map(sanitise).join(' ').trim()
}

export function sanitise(generated: string) {
  return generated.replace(/\s+/g, ' ').trim()
}
