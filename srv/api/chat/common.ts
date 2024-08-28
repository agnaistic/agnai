import { AppSchema } from '../../../common/types/schema'
import { sanitise } from '/common/requests/util'

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

export function joinParts(parts: string[]) {
  return parts.map(sanitise).join(' ').trim()
}

export function normalizeUrl(url: string) {
  return url.replace(/\/$/, '')
}
