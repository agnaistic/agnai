import gpt from 'gpt-3-encoder'
import { formatCharacter } from '../../common/prompt'
import { store } from '../db'
import { AppSchema } from '../db/schema'

type PromptOpts = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  members: AppSchema.Profile[]
  settings: AppSchema.GenSettings
  retry?: AppSchema.ChatMessage
}

const DEFAULT_MAX_TOKENS = 2048

const BOT_REPLACE = /\{\{char\}\}/g
const SELF_REPLACE = /\{\{user\}\}/g

export async function createPrompt({ chat, char, members, retry, settings }: PromptOpts) {
  const pre: string[] = [`${char.name}'s Persona: ${formatCharacter(char.name, chat.overrides)}`]

  if (chat.scenario) {
    pre.push(`Scenario: ${chat.scenario}`)
  }

  pre.push(`<START>`, ...chat.sampleChat.split('\n'))

  const post = [`${char.name}:`]

  const prompt = await insertMessages({ chat, members, char, settings, pre, post, retry })
  return prompt
}

type InsertOpts = PromptOpts & { pre: string[]; post: string[]; msgs?: string[] }

async function insertMessages(opts: InsertOpts) {
  const { settings, members, chat, char, pre, post, retry } = opts
  const maxContext = settings.maxContextLength || DEFAULT_MAX_TOKENS
  const owner = members.find((mem) => mem.userId === chat.userId)
  if (!owner) {
    throw new Error(`Cannot produce prompt: Owner profile not found`)
  }

  // We need to do this early for accurate token counts
  const preamble = pre
    .filter(removeEmpty)
    .join('\n')
    .replace(BOT_REPLACE, char.name)
    .replace(SELF_REPLACE, owner.handle)
  const postamble = post
    .filter(removeEmpty)
    .join('\n')
    .replace(BOT_REPLACE, char.name)
    .replace(SELF_REPLACE, owner.handle)

  let tokens = gpt.encode(preamble + '\n' + postamble).length
  const lines: string[] = []
  let before = retry?.createdAt

  do {
    const messages = await store.chats.getRecentMessages(chat._id, before)
    const history = messages.map((chat) => prefix(chat, char.name, members) + chat.msg)

    for (const hist of history) {
      const nextTokens = gpt.encode(hist).length
      if (nextTokens + tokens > maxContext) break
      tokens += nextTokens
      lines.unshift(hist)
    }

    if (tokens >= maxContext || messages.length < 50) break
    before = messages.slice(-1)[0].createdAt
  } while (true)

  const middle = lines
    .join('\n')
    .replace(BOT_REPLACE, char.name)
    .replace(SELF_REPLACE, owner.handle)

  const prompt = [preamble, middle, postamble].join('\n')

  return prompt
}

function prefix(chat: AppSchema.ChatMessage, bot: string, members: AppSchema.Profile[]) {
  const member = members.find((mem) => chat.userId === mem.userId)

  return chat.characterId ? `${bot}: ` : `${member?.handle}: `
}

function removeEmpty(value?: string) {
  return !!value
}
