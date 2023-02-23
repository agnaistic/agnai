import needle from 'needle'
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
  max_context_length: 1400, // Tuneable by user?
  /**
   * We deliberately use a low 'max length' to aid with streaming and the lack of support of 'stop tokens' in Kobold.
   */
  max_length: 32,

  // Generation settings -- Can be overriden by the user
  temperature: 0.65,
  top_a: 0.0,
  top_p: 0.9,
  top_k: 0,
  typical: 1,
  rep_pen: 1.08,
  rep_pen_slope: 0.9,
  rep_pen_range: 1024,
  tfs: 0.9,
  sampler_order: [6, 0, 1, 2, 3, 4, 5],
}

export const handleKobold: ModelAdapter = async function* ({
  chat,
  char,
  history,
  message,
  settings,
}) {
  const body = {
    ...base,
    prompt: createPrompt({ chat, char, history, message }),
  }

  let attempts = 0
  let maxAttempts = body.max_length / MAX_NEW_TOKENS + 4

  const username = 'You'
  const endTokens = [
    `${username}:`,
    `${char.name}:`,
    `${username} :`,
    `${char.name} :`,
    'END_OF_DIALOG',
  ]
  const parts: string[] = []

  while (attempts < maxAttempts) {
    attempts++

    const response = await needle('post', `${settings.koboldUrl}/api/v1/generate`, body, {
      json: true,
    })

    const text = response.body.results?.[0]?.text as string
    if (text) {
      parts.push(text)
      const combined = joinParts(parts)

      for (const endToken of endTokens) {
        if (combined.includes(endToken)) {
          const [first] = combined.split(endToken)
          logger.info({ all: joinParts(parts), reply: first }, 'Kobold response')
          yield first
          return
        }
      }

      body.prompt += text
      yield joinParts(parts)
    } else {
      logger.error({ err: response.body }, 'Failed to generate text using Kobold adapter')
      yield { error: response.body }
      return
    }
  }
}

function sanitise(generated: string) {
  return generated.replace(/\s+/g, ' ').trim()
}

function joinParts(parts: string[]) {
  return parts.map(sanitise).join(' ')
}
