import { createMemo } from 'solid-js'
import { isLoggedIn } from '../api'
import { getStore } from '../create'
import { toastStore } from '../toasts'
import { loadItem } from './storage'
import { ModelFormat, replaceTags } from '/common/presets/templates'
import { getChatPreset } from '/common/prompt'
import { AppSchema } from '/common/types'
import { deepClone } from '/common/util'
import { getBotsForChat } from '/web/pages/Chat/util'
import { getUserPreset } from '/web/shared/adapter'

export type GenerateEntities = Awaited<ReturnType<typeof getPromptEntities>>

export type PromptEntities = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  user: AppSchema.User
  profile: AppSchema.Profile
  book?: AppSchema.MemoryBook
  messages: AppSchema.ChatMessage[]
  settings: Partial<AppSchema.UserGenPreset>
  members: AppSchema.Profile[]
  chatBots: AppSchema.Character[]
  autoReplyAs?: string
  characters: Record<string, AppSchema.Character>
  impersonating?: AppSchema.Character
  lastMessage?: { msg: string; date: string; id: string; parent?: string }
  scenarios?: AppSchema.ScenarioBook[]
  imageData?: string
}

export function getInferencePreset(
  settings?: Partial<AppSchema.GenSettings>
): Partial<AppSchema.GenSettings> {
  if (settings) return settings
  const { user } = getStore('user').getState()
  if (!user) {
    toastStore.error(`Could not get user settings. Refresh and try again.`)
    return {}
  }

  const preset = getUserPreset(user?.defaultPreset)
  const fallback = getStore('settings')
    .getState()
    .config.subs.find((s) => s.preset.isDefaultSub)

  return preset || fallback?.preset || {}
}

export async function getPromptEntities(): Promise<PromptEntities> {
  if (isLoggedIn()) {
    const entities = getAuthedPromptEntities()
    if (!entities) throw new Error(`Could not collate data for prompting`)
    return {
      ...entities,
      messages: entities.messages.filter((msg) => msg.ooc !== true && msg.adapter !== 'image'),
      lastMessage: getLastUserMessage(entities.messages),
    }
  }

  const entities = await getGuestEntities()
  if (!entities) throw new Error(`Could not collate data for prompting`)
  return {
    ...entities,
    messages: entities.messages.filter((msg) => msg.ooc !== true && msg.adapter !== 'image'),
    lastMessage: getLastUserMessage(entities.messages),
  }
}

export function replaceUniversalTags(prompt: string, format?: ModelFormat) {
  if (!format) {
    const preset = getInferencePreset()
    format = preset.modelFormat || 'Alpaca'
  }

  return replaceTags(prompt, format)
}

async function getGuestEntities() {
  const { active } = getStore('chat').getState()
  if (!active) return
  const { msgs, messageHistory, attachments } = getStore('messages').getState()

  const chat = active.chat
  const char = active.char

  if (!chat || !char) return

  const book = chat?.memoryId
    ? await loadItem('memory').then((res) => res.find((mem) => mem._id === chat.memoryId))
    : undefined

  const allScenarios = await loadItem('scenario')
  const profile = await loadItem('profile')
  const user = await loadItem('config')
  const settings = await getGuestPreset(user, chat)
  const scenarios = allScenarios?.filter(
    (s) => chat.scenarioIds && chat.scenarioIds.includes(s._id)
  )

  const { impersonating, chatChars } = getStore('character').getState()

  const characters = getBotsForChat(chat, char, chatChars.map)

  return {
    chat,
    char,
    user,
    profile,
    book,
    messages: messageHistory.concat(msgs),
    settings,
    members: [profile] as AppSchema.Profile[],
    chatBots: chatChars.list,
    autoReplyAs: active.replyAs,
    characters,
    impersonating,
    scenarios,
    imageData: attachments[chat._id]?.image,
  }
}

function getAuthedPromptEntities() {
  const { active, chatProfiles: members } = getStore('chat').getState()
  if (!active) return

  const { profile, user } = getStore('user').getState()
  if (!profile || !user) return

  const chat = active.chat
  const char = active.char

  const book = getStore('memory')
    .getState()
    .books.list.find((book) => book._id === chat.memoryId)

  const { msgs, messageHistory, attachments } = getStore('messages').getState()
  const settings = getActivePreset(chat, user)!
  const scenarios = getStore('scenario')
    .getState()
    .scenarios.filter((s) => chat.scenarioIds && chat.scenarioIds.includes(s._id))

  const { impersonating, chatChars } = getStore('character').getState()

  const characters = getBotsForChat(chat, char, chatChars.map)

  return {
    chat,
    char,
    user,
    profile,
    book,
    messages: messageHistory.concat(msgs),
    settings,
    members,
    chatBots: chatChars.list,
    autoReplyAs: active.replyAs,
    characters,
    impersonating,
    scenarios,
    imageData: attachments[chat._id]?.image,
  }
}

export function useActivePreset() {
  const chat = getStore('chat')()
  const user = getStore('user')()

  const preset = createMemo(() => {
    if (!chat.active?.chat || !user.user) return
    const { presets, templates } = getStore('presets').getState()

    const preset = deepClone(getChatPreset(chat.active.chat, user.user, presets))

    if (preset.promptTemplateId) {
      const template = templates.find((t) => t._id === preset.promptTemplateId)
      preset.gaslight = template?.template || preset.gaslight
    }

    applySubscriptionAdjustment(preset)

    return preset
  })

  return preset
}

export function getActivePreset(
  chat?: AppSchema.Chat,
  user?: AppSchema.User
): Partial<AppSchema.GenSettings> | undefined {
  if (!chat) {
    chat = getStore('chat').getState().active?.chat!
  }

  if (!user) {
    user = getStore('user').getState().user!
  }

  if (!chat || !user) {
    const msg = `Cannot retrieve active preset ${!chat ? '[chat]' : ''} ${!user ? '[user]' : ''}`
    toastStore.error(msg)
    throw new Error(msg)
  }

  const { presets, templates } = getStore('presets').getState()
  const preset = deepClone(getChatPreset(chat, user, presets))

  if (preset.promptTemplateId) {
    const template = templates.find((t) => t._id === preset.promptTemplateId)
    preset.gaslight = template?.template || preset.gaslight
  }

  applySubscriptionAdjustment(preset)

  return preset
}

function applySubscriptionAdjustment(preset: Partial<AppSchema.UserGenPreset>) {
  if (preset.service !== 'agnaistic') return preset

  const subs = getStore('settings').getState().config.subs
  const match = subs.find((sub) => sub._id === preset.registered?.agnaistic?.subscriptionId)
  if (!match) return preset

  return {
    ...preset,
    maxContextLength: Math.min(preset.maxContextLength!, match.preset.maxContextLength!),
    maxTokens: Math.min(preset.maxTokens!, match.preset.maxTokens!),
  }
}

async function getGuestPreset(user: AppSchema.User, chat: AppSchema.Chat) {
  // The server does not store presets for users
  // Override the `genSettings` property with the locally stored preset data if found
  const presets = await loadItem('presets')
  return getChatPreset(chat, user, presets)
}

function getLastUserMessage(messages: AppSchema.ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!msg.userId) continue
    return { msg: msg.msg, date: msg.createdAt, id: msg._id, parent: msg.parent }
  }
}
