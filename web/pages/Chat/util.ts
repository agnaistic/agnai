import { createMemo } from 'solid-js'
import { defaultPresets, isDefaultPreset } from '/common/default-preset'
import { getFallbackPreset } from '/common/presets'
import { AppSchema } from '/common/types'
import { getStore } from '/web/store/create'

export function getChatPreset(
  chat: AppSchema.Chat,
  user: AppSchema.User,
  userPresets: AppSchema.UserGenPreset[]
): Partial<AppSchema.UserGenPreset> {
  /**
   * Order of precedence:
   * 1. chat.genPreset
   * 2. user.defaultPreset
   * 3. built-in fallback preset (horde)
   */

  // #1
  if (chat.genPreset) {
    if (isDefaultPreset(chat.genPreset))
      return { _id: chat.genPreset, ...defaultPresets[chat.genPreset] }

    const preset = userPresets.find((preset) => preset._id === chat.genPreset)
    if (preset) return preset
  }

  // #2
  const defaultId = user.defaultPreset
  if (defaultId) {
    if (isDefaultPreset(defaultId)) return { _id: defaultId, ...defaultPresets[defaultId] }
    const preset = userPresets.find((preset) => preset._id === defaultId)
    if (preset) return preset
  }

  // #3
  return getFallbackPreset('agnaistic')
}

/**
 * Retrieve the unique set of active bots for a conversation
 */
export function getActiveBots(
  chat: AppSchema.Chat,
  bots: Record<string, AppSchema.Character>,
  exclude?: Record<string, any>
) {
  if (!chat) return []
  const unique = new Set([chat.characterId])

  for (const [id, active] of Object.entries(chat.characters || {})) {
    if (exclude && id in exclude) continue
    if (!active) continue
    if (!bots[id]) continue
    unique.add(id)
  }

  for (const [id, active] of Object.entries(chat.tempCharacters || {})) {
    if (exclude && id in exclude) continue
    if (!active) continue
    if (active.favorite === false) continue
    if (active.deletedAt) continue
    unique.add(id)
  }

  const all = Array.from(unique)
    .map((id) => bots[id] || chat.tempCharacters?.[id])
    .filter((bot) => !!bot)
    .sort(tempSort)
  return all
}

export function useEditableBots() {
  const chars = getStore('character')((s) => ({
    chatBots: s.characters.list,
    botMap: s.characters.map,
    impersonate: s.impersonating,
  }))

  const chats = getStore('chat')((s) => {
    return {
      chat: s.details[s.lastChatId]?.chat,
      char: s.details[s.lastChatId]?.char,
      opts: s.opts,
      activeBots: getActiveBots(s.details[s.lastChatId]?.chat!, chars.botMap),
      tempBots: Object.values(s.details[s.lastChatId]?.chat?.tempCharacters! || {}),
    }
  })

  const editableCharcters = createMemo(() => {
    const ids = new Map<string, AppSchema.Character>()

    if (chats.char) {
      ids.set(chats.char._id, chats.char)
    }

    if (chars.impersonate) {
      ids.set(chars.impersonate._id, chars.impersonate)
    }

    for (const bot of chats.activeBots) {
      if (bot.deletedAt) continue
      if (bot._id.startsWith('temp-') && bot.favorite === false) continue
      ids.set(bot._id, bot)
    }

    for (const bot of Object.values(chats.chat?.tempCharacters || {})) {
      ids.set(bot._id, bot)
    }

    const editable = Array.from(ids.values())
    return editable
  })

  return editableCharcters
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

  for (const [id, char] of Object.entries(chat.tempCharacters || {})) {
    chars[id] = char
  }

  return chars
}

export function canConvertGaslightV2(preset: Partial<AppSchema.UserGenPreset>) {
  // Do not upgrade built-in presets
  if (!preset?._id) return false

  // Do not upgrade presets without a gaslight
  if (!preset.gaslight) return false

  // Do not upgrade presets with an unknown service -- only models that support instruct are supported
  if (!preset.service) return false

  return true
}

function tempSort(a: AppSchema.Character, b: AppSchema.Character) {
  return +!b._id.startsWith('temp-') - +!a._id.startsWith('temp-') || a.name.localeCompare(b.name)
}

export function isEligible() {
  const cfg = getStore('settings').getState()
  const user = getStore('user').getState()

  const eligible = cfg.config.subs.some((sub) => user.userLevel >= sub.level)
  return eligible
}
