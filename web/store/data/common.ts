import { createMemo } from 'solid-js'
import { getStore } from '../create'
import { toastStore } from '../toasts'
import { ModelFormat, replaceTags } from '/common/presets/templates'
import { AppSchema } from '/common/types'
import { deepClone, trimSentence } from '/common/util'
import { getBotsForChat, getChatPreset } from '/web/pages/Chat/util'
import { getUserPreset } from '/web/shared/adapter'
import { getPresetConnection } from '/common/providers'
import { ChatMessageExt } from '../message'
import { MsgAttachment } from '/srv/adapter/type'
import { simplifyPreset } from '/common/prompt'

export type PromptEntities = NonNullable<Awaited<ReturnType<typeof getAuthedPromptEntities>>> & {
  lastMessage?: { msg: string; date: string; id: string; parent?: string }
  props: Record<string, string>
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

export async function getImagePromptEntities(messageId?: string) {
  const entities = await getPromptEntities({ messageId })
  const source = entities.chat.imageSource || 'settings'

  let summary = ''
  let presetId = ''

  switch (source) {
    case 'settings': {
      summary = entities.user.images?.summaryPrompt || ''
      presetId = entities.user.summaryPreset || entities.user.images?.summaryPresetId || ''
      break
    }

    case 'last-character': // <-- Is this correct?
    case 'main-character': {
      summary = entities.char.imageSettings?.summaryPrompt || ''
      presetId = entities.char.imageSettings?.summaryPresetId || ''
      break
    }

    case 'chat': {
      summary = entities.chat.imageSettings?.summaryPrompt || ''
      presetId = entities.chat.imageSettings?.summaryPresetId || ''
      break
    }
  }

  if (!presetId) return { entities, summary, preset: undefined }

  const preset = getStore('presets')
    .getState()
    .presets.find((p) => p._id === presetId)

  return { entities, summary, preset }
}

export async function getPromptEntities(opts?: { messageId?: string }): Promise<PromptEntities> {
  const promptState = getStore('prompt').getState()

  const props = {
    hint: promptState.hintsEnabled ? promptState.hint : '',
  }

  const entities = getAuthedPromptEntities() //isLoggedIn() ?  : await getGuestEntities()

  if (!entities) throw new Error(`Could not collate data for prompting`)

  const conn = getPresetConnection({ ...entities.settings }, entities.user.providers)
  const sub = getPresetSubscription(conn.preset)
  const simple = simplifyPreset(entities.user, conn.preset, sub?.preset)
  entities.settings = simple

  if (opts?.messageId) {
    const index = entities.messages.findLastIndex((m) => m._id === opts.messageId)
    if (index >= 0) {
      entities.messages = entities.messages.slice(0, index + 1)
    }
  }

  return {
    ...entities,
    props,
    messages: entities.messages.filter((msg) => msg.ooc !== true && msg.adapter !== 'image'),
    lastMessage: getLastUserMessage(entities.messages),
  }
}

function getPresetSubscription(gen: Partial<AppSchema.GenSettings> | undefined) {
  if (!gen) return

  // If it's a 'preset (non-provider)' preset, check the `.service` property
  if (!gen.providerId && gen.service !== 'agnaistic') return

  // If it's a modern (provider) preset, check the `.providerId`
  if (gen.providerId && gen.providerId !== 'agnaistic') return

  const subId = gen.providerModels?.agnaistic || gen.registered?.agnaistic?.subscriptionId
  if (!subId) return

  const { subs } = getStore('settings').getState().config
  const sub = subs.find((sub) => sub._id === subId)
  return sub
}

export function replaceUniversalTags(prompt: string, format?: ModelFormat) {
  if (!format) {
    const preset = getInferencePreset()
    format = preset.modelFormat || 'None'
  }

  return replaceTags(prompt, format)
}

// async function getGuestEntities() {
//   const { details, lastChatId } = getStore('chat').getState()
//   const active = details[lastChatId]

//   if (!active) return
//   const { msgs, messageHistory, attachments } = getStore('messages').getState()

//   const chat = active.chat
//   const char = active.char

//   if (!chat || !char) return

//   const book = chat?.memoryId
//     ? await loadItem('memory').then((res) => res.find((mem) => mem._id === chat.memoryId))
//     : undefined

//   const allScenarios = await loadItem('scenario')
//   const profile = await loadItem('profile')
//   const user = await loadItem('config')
//   const settings = await getGuestPreset(user, chat)
//   const scenarios = allScenarios?.filter(
//     (s) => chat.scenarioIds && chat.scenarioIds.includes(s._id)
//   )

//   const { impersonating, chatChars } = getStore('character').getState()

//   const characters = getBotsForChat(chat, char, chatChars.map)
//   const conn = getPresetConnection(settings, user.providers)
//   const messages = trimMessages(user, messageHistory.concat(msgs))

//   const sub = getPresetSubscription(conn.preset)
//   const simple = simplifyPreset(user, conn.preset, sub?.preset)

//   return {
//     chat,
//     char,
//     user,
//     profile,
//     book,
//     messages,
//     settings: simple,
//     members: [profile] as AppSchema.Profile[],
//     chatBots: chatChars.list,
//     autoReplyAs: active.replyAs,
//     characters,
//     impersonating,
//     scenarios,
//     attachments: getChatAttachments(chat._id, messages, attachments),
//     conn,
//   }
// }

function trimMessages(user: AppSchema.User, messages: ChatMessageExt[]) {
  if (!user.ui?.trimSentences) return messages

  return messages.map((msg) => ({ ...msg, msg: trimSentence(msg.msg) }))
}

function getChatAttachments(
  chatId: string,
  messages: AppSchema.ChatMessage[],
  attachments: Record<string, MsgAttachment[]>
) {
  const next: Record<string, MsgAttachment[]> = {}
  const ids = new Set(messages.map((m) => m._id).concat(chatId))

  for (const key in attachments) {
    if (!ids.has(key)) continue
    next[key] = attachments[key]
  }

  return next
}

function getAuthedPromptEntities() {
  const { details, chatProfiles: members, lastChatId } = getStore('chat').getState()
  const active = details[lastChatId]
  if (!active) return

  const { profile, user } = getStore('user').getState()
  if (!profile || !user) return

  const chat = active.chat
  const char = active.char

  const bookIds = new Set((chat.memoryId || '').split(',').filter((id) => !!id.trim()))
  const books = getStore('memory')
    .getState()
    .books.list.filter((book) => bookIds.has(book._id))

  const { msgs, messageHistory, attachments } = getStore('messages').getState()
  const presets = getActivePreset(chat, user)!
  const conn = getPresetConnection(presets.current, user.providers)
  const scenarios = getStore('scenario')
    .getState()
    .scenarios.filter((s) => chat.scenarioIds && chat.scenarioIds.includes(s._id))

  const { impersonating, chatChars } = getStore('character').getState()

  const characters = getBotsForChat(chat, char, chatChars.map)
  const messages = trimMessages(user, messageHistory.concat(msgs))

  const sub = getPresetSubscription(conn.preset)
  const simple = simplifyPreset(user, conn.preset, sub?.preset)

  return {
    chat,
    char: tryReplaceCharacter(chatChars.map, char)!,
    user,
    profile,
    books,
    messages,
    settings: simple,
    members,
    chatBots: chatChars.list,
    autoReplyAs: active.replyAs,
    characters,
    impersonating: tryReplaceCharacter(chatChars.map, impersonating),
    scenarios,
    attachments: getChatAttachments(chat._id, messages, attachments),
    conn,
    presets: {
      current: presets.current,
      json: presets.json || presets.current,
      summary: presets.summary,
      chargen: presets.chargen,
    },
  }
}

function tryReplaceCharacter(
  map: Record<string, AppSchema.Character>,
  char: AppSchema.Character | undefined
) {
  if (!char) return

  const replacement = map[char._id]
  return replacement || char
}

export function useActivePreset() {
  const chat = getStore('chat')((s) => ({ active: s.details[s.lastChatId] }))
  const user = getStore('user')((s) => ({ user: s.user }))

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

export function getActivePreset(chat?: AppSchema.Chat, user?: AppSchema.User) {
  if (!chat) {
    const { details, lastChatId } = getStore('chat').getState()
    chat = details[lastChatId]?.chat
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

  const json = user.jsonPreset ? presets.find((p) => p._id === user.jsonPreset) : undefined
  const summary = user.summaryPreset ? presets.find((p) => p._id === user.summaryPreset) : undefined
  const chargen = user.chargenPreset ? presets.find((p) => p._id === user.chargenPreset) : undefined

  applySubscriptionAdjustment(preset)

  return { current: preset, json, summary, chargen }
}

function applySubscriptionAdjustment(preset: Partial<AppSchema.UserGenPreset>) {
  if (preset.service !== 'agnaistic') return preset

  const subs = getStore('settings').getState().config.subs
  const modelId = preset.providerModels?.agnaistic || preset.registered?.agnaistic?.subscriptionId
  const match = subs.find((sub) => sub._id === modelId)
  if (!match) return preset

  return {
    ...preset,
    maxContextLength: Math.min(preset.maxContextLength!, match.preset.maxContextLength!),
    maxTokens: Math.min(preset.maxTokens!, match.preset.maxTokens!),
  }
}

// async function getGuestPreset(user: AppSchema.User, chat: AppSchema.Chat) {
//   // The server does not store presets for users
//   // Override the `genSettings` property with the locally stored preset data if found
//   const presets = await loadItem('presets')
//   return getChatPreset(chat, user, presets)
// }

function getLastUserMessage(messages: AppSchema.ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!msg.userId) continue
    return { msg: msg.msg, date: msg.createdAt, id: msg._id, parent: msg.parent }
  }
}
