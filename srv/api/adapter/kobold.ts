import needle from 'needle'
import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { formatCharacter } from '../../db/util'
import { logger } from '../../logger'
import { ModelAdapter } from './type'

type KoboldRequest = {
  prompt: string
  temperature: number

  /** typical p */
  typical: number

  /** repetition penalty */
  rep_pen: number
}

const MAX_NEW_TOKENS = 196

const base = {
  use_story: false,
  use_memory: false,
  use_authors_note: false,
  use_world_info: false,
  max_context_length: 768, // Tuneable by user?
  /**
   * We deliberately use a low 'max length' to aid with streaming and the lack of support of 'stop tokens' in Kobold.
   *
   */
  max_length: 32,

  // Generation settings -- Can be overriden by the user
  temperature: 0.5,
  top_p: 0.9,
  top_k: 0,
  typical: 1,
  rep_pen: 1.05,
}

const BOT_REPLACE = /\{\{char\}\}/g
const SELF_REPLACE = /\{\{user\}\}/g

export const handleKobold: ModelAdapter = async function* (chat, char, history, message: string) {
  const settings = await store.settings.get()
  if (!settings.koboldUrl) {
    return { error: 'Kobold URL not set' }
  }

  /** @TODO This should be configurable in the Chat */
  const username = 'You'

  const persona = formatCharacter(char.name, char.persona)
  const lastChats = history
    .slice(-8)
    .map((chat) => prefix(chat, char.name, username) + replaceNames(chat.msg, char.name, username))
  const scenario = replaceNames(chat.scenario, char.name, username)
  const sampleChat = replaceNames(chat.sampleChat, char.name, username).split('\n')

  const body = {
    ...base,
    prompt: [
      `${char.name}'s Persona: ${persona}`,
      `Scenario: ${scenario}`,
      `<START>`,
      ...sampleChat,
      ...lastChats,
      `${username}: ${message}`,
      `${char.name}:`,
    ]
      .filter(removeEmpty)
      .join('\n')
      .replace(BOT_REPLACE, chat.name)
      .replace(SELF_REPLACE, username),
  }

  logger.warn(body.prompt)

  let attempts = 0

  let maxAttempts = body.max_length / MAX_NEW_TOKENS + 4

  const endTokens = [`\n${username}:`, `\n${char.name}:`]

  while (attempts < maxAttempts) {
    attempts++

    const response = await needle('post', `${settings.koboldUrl}/api/v1/generate`, body, {
      json: true,
    })

    const text = response.body.results?.[0]?.text as string
    if (text) {
      for (const endToken of endTokens) {
        if (text.includes(endToken)) {
          const [first] = text.split(endToken)
          yield first
          return
        }
      }

      body.prompt += text
      yield text
    }
  }
}

function prefix(chat: AppSchema.ChatMessage, bot: string, user: string) {
  return chat.characterId ? `${bot}: ` : `${user}: `
}

function replaceNames(msg: string, bot: string, user: string) {
  return msg.replace(BOT_REPLACE, bot).replace(SELF_REPLACE, user)
}

function removeEmpty(value?: string) {
  return !!value
}
