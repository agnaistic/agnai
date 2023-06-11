import { AppSchema } from '/srv/db/schema'

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
