import { AppSchema, TokenCounter } from '../../common/types'
import { store } from '../db'

type PromptOpts = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  members: AppSchema.Profile[]
  settings: AppSchema.GenSettings
  retry?: AppSchema.ChatMessage
  continue?: string
}

const DEFAULT_MAX_TOKENS = 2048

export async function getMessagesForPrompt(opts: PromptOpts, encoder: TokenCounter) {
  const { chat, settings, char, members, retry } = opts
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
      const nextTokens = await encoder(hist)
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
