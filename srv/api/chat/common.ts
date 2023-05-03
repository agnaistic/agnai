import { customSettings } from '../../config'
import { AppSchema } from '../../db/schema'

export const personaValidator = {
  kind: ['wpp', 'sbf', 'boostyle', 'text'],
  attributes: 'any',
} as const

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
  const baseEndTokens = ['END_OF_DIALOG', '<END>'].concat(endTokens)

  if (customSettings.baseEndTokens) {
    baseEndTokens.push(...customSettings.baseEndTokens)
  }

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
  // If want to support code blocks we need to remove the excess whitespace removal as it breaks indents
  return generated.trim()
}
