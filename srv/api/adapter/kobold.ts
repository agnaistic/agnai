import needle from 'needle'
import { store } from '../../db'
import { logger } from '../../logger'
import { createPrompt } from './prompt'
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

export const handleKobold: ModelAdapter = async function* (chat, char, history, message: string) {
  const settings = await store.settings.get()
  if (!settings.koboldUrl) {
    return { error: 'Kobold URL not set' }
  }

  const body = {
    ...base,
    prompt: createPrompt({ chat, char, history, message }),
  }

  logger.warn(body.prompt)

  let attempts = 0
  let maxAttempts = body.max_length / MAX_NEW_TOKENS + 4

  const username = 'You'
  const endTokens = [`\n${username}:`, `\n${char.name}:`]

  while (attempts < maxAttempts) {
    attempts++

    const response = await needle('post', `${settings.koboldUrl}/api/v1/generate`, body, {
      json: true,
    })

    const text = response.body.results?.[0]?.text as string
    if (text) {
      logger.warn(`Tokens: ${text}`)
      for (const endToken of endTokens) {
        if (text.includes(endToken)) {
          const [first] = text.split(endToken)
          yield first
          return
        }
      }

      body.prompt += text
      yield text
    } else {
      logger.error({ err: response.body }, 'Failed to generate text using Kobold adapter')
      yield { error: response.body }
      return
    }
  }
}
