import { TokenCounter } from '../../common/tokenize'
import { store } from '../db'
import { AppSchema } from '../../common/types/schema'
import { AdapterProps } from './type'

type PromptOpts = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  members: AppSchema.Profile[]
  settings: AppSchema.GenSettings
  retry?: AppSchema.ChatMessage
  continue?: string
}

const DEFAULT_MAX_TOKENS = 2048

export async function getMessagesForPrompt(
  { chat, settings, char, members, retry }: PromptOpts,
  encoder: TokenCounter
) {
  const maxContext = settings.maxContextLength || DEFAULT_MAX_TOKENS
  let before: string | undefined
  let tokens = 0

  const lines: string[] = []
  const msgs: AppSchema.ChatMessage[] = []

  const formatMsg = (chat: AppSchema.ChatMessage) => prefix(chat, char.name, members) + chat.msg

  do {
    const messages = await store.msgs
      .getRecentMessages(chat._id, before)
      .then((msg) => msg.filter((m) => m._id !== retry?._id))
    msgs.push(...messages)
    const history = messages.map(formatMsg)

    for (const hist of history) {
      const nextTokens = encoder(hist)
      if (nextTokens + tokens > maxContext) break
      tokens += nextTokens
      lines.unshift(hist)
    }

    if (tokens >= maxContext || messages.length < 50) break
    before = messages.slice(-1)[0].createdAt
  } while (true)

  return { lines, messages: msgs }
}

function prefix(chat: AppSchema.ChatMessage, bot: string, members: AppSchema.Profile[]) {
  const member = members.find((mem) => chat.userId === mem.userId)

  return chat.characterId ? `${bot}: ` : `${member?.handle}: `
}

export function getStoppingStrings(opts: AdapterProps, extras: string[] = []) {
  const seen = new Set<string>(extras)
  const unique = new Set<string>(extras)

  const chars = Object.values(opts.characters || {})
  if (opts.impersonate) {
    chars.push(opts.impersonate)
  }

  for (const char of chars) {
    if (seen.has(char.name)) continue
    if (char.name === opts.replyAs.name) continue
    unique.add(`${char.name}:`)
    unique.add(`\n${char.name}`)
    seen.add(char.name)
  }

  for (const member of opts.members) {
    if (seen.has(member.handle)) continue
    if (member.handle === opts.replyAs.name) continue
    unique.add(`${member.handle}:`)
    unique.add(`\n${member.handle}`)
    seen.add(member.handle)
  }

  if (opts.gen.stopSequences) {
    for (const stop of opts.gen.stopSequences) {
      seen.add(stop)
      unique.add(stop)
    }
  }

  return Array.from(unique.values())
}
