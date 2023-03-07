import gpt from 'gpt-3-encoder'
import { store } from '../../db'
import { AppSchema } from '../../db/schema'

const MAX_TOKENS = 128
const BOT_REPLACE = /\{\{char\}\}/g
const SELF_REPLACE = /\{\{user\}\}/g

const suffix = ` ### disfigured, ugly, deformed, poorly, censor, censored, blurry, lowres, fused, malformed, watermark, misshapen, duplicated, grainy, distorted, signature`
const suffixLength = gpt.encode(suffix).length

export type ImageRequest = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  members: AppSchema.Profile[]
}

export async function createImagePrompt({ chat, members, char }: ImageRequest) {
  const lastMessages = await store.chats.getRecentMessages(chat._id)

  const fit: string[] = []
  let current = suffixLength

  for (const msg of lastMessages) {
    const sender = msg.characterId
      ? char.name
      : members.find((mem) => mem.userId === msg.userId)?.handle
    if (!sender) continue

    const text =
      `${sender}: ` + msg.msg.replace(BOT_REPLACE, char.name).replace(SELF_REPLACE, sender)
    const length = gpt.encode(text).length
    if (length + current > MAX_TOKENS) break

    current += length
    fit.push(text)
  }

  const prompt = fit.join('\n') + suffix
  return prompt
}
