import { customSettings } from '../../config'
import { AppSchema } from '../../../common/types/schema'

export const personaValidator = {
  kind: ['wpp', 'sbf', 'boostyle', 'text', 'attributes'],
  attributes: 'any',
} as const

export function extractActions(text: string) {
  const [split, rawActions] = text.split('ACTIONS:')
  if (!rawActions || !rawActions.trim()) {
    let responses: string[] = []
    const actions: AppSchema.ChatMessage['actions'] = []
    const splits = text.split('\n')

    for (const split of splits) {
      const [emote, action] = split.split('->')
      if (!action) {
        responses.push(emote)
        continue
      }

      actions.push({ emote: emote.trim().replace('{', '').replace('}', ''), action: action.trim() })
    }

    return { text: responses.join('\n'), actions }
  }

  const actions = rawActions
    .split('\n')
    .filter((line) => !!line.trim())
    .map((line) => line.trim().split('-'))
    .map(([emote, action]) => ({ emote, action }))

  return { text: split.trim(), actions }
}

export function trimResponseV2(
  generated: string,
  char: AppSchema.Character,
  members: AppSchema.Profile[],
  bots: Record<string, AppSchema.Character> | undefined,
  endTokens: string[] = []
) {
  const allEndTokens = getEndTokens(null, members)

  generated = generated.split(`${char.name} :`).join(`${char.name}:`)

  for (const member of members) {
    if (!member.handle) continue
    generated = generated.split(`${member.handle} :`).join(`${member.handle}:`)
  }

  if (bots) {
    for (const bot of Object.values(bots)) {
      if (!bot) continue
      if (bot?._id === char._id) continue
      endTokens.push(`${bot.name}:`)
    }
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

export function sanitiseAndTrim(
  text: string,
  prompt: string,
  char: AppSchema.Character,
  characters: Record<string, AppSchema.Character> | undefined,
  members: AppSchema.Profile[]
) {
  const parsed = sanitise(text.replace(prompt, ''))
  const trimmed = trimResponseV2(parsed, char, members, characters, ['END_OF_DIALOG'])
    .split(`${char.name}:`)
    .join('')
  return trimmed || parsed
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

export function normalizeUrl(url: string) {
  return url.replace(/\/$/, '')
}
