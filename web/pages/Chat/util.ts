import { SUPPORTS_INSTRUCT } from '/common/adapters'
import { AppSchema } from '/common/types'

/**
 * Retrieve the unique set of active bots for a conversation
 */
export function getActiveBots(chat: AppSchema.Chat, bots: Record<string, AppSchema.Character>) {
  if (!chat) return []
  const unique = new Set([chat.characterId])

  for (const [id, active] of Object.entries(chat.characters || {})) {
    if (!active) continue
    if (!bots[id]) continue
    unique.add(id)
  }

  const all = Array.from(unique)
    .map((id) => bots[id])
    .filter((bot) => !!bot)
  return all
}

export function getBotsForChat(
  chat: AppSchema.Chat,
  main: AppSchema.Character,
  bots: Record<string, AppSchema.Character>
) {
  const chars: Record<string, AppSchema.Character> = { [main._id]: main }

  for (const key in chat.characters || {}) {
    const bot = bots[key]
    if (bot) chars[key] = bot
  }

  return chars
}

export function canConvertGaslightV2(preset: Partial<AppSchema.UserGenPreset>) {
  if (!preset?._id) return false
  if (!preset.gaslight) return false
  if (!preset.service) return false
  if (!SUPPORTS_INSTRUCT[preset.service]) return false
  if (!preset._id !== undefined && preset._id !== '') return false
  return true
}
