import { AppSchema } from '../srv/db/schema'
import { getEncoder } from './tokenize'

const BOT_REPLACE = /\{\{char\}\}/g
const SELF_REPLACE = /\{\{user\}\}/g

export type ImagePromptOpts = {
  user: AppSchema.User
  messages: AppSchema.ChatMessage[]
  members: AppSchema.Profile[]
  char: AppSchema.Character
}

export function createImagePrompt(opts: ImagePromptOpts) {
  const maxTokens = getMaxTokens(opts.user)

  /**
   * TODO: Use chat summarization when available
   */

  const lines: string[] = []
  let tokens = 0

  const encoder = getEncoder('main')

  // TODO: Verify incoming ordering, it should be ascending
  for (const { msg, userId } of opts.messages.slice().reverse()) {
    const handle = userId ? opts.members.find((pr) => pr.userId === userId)?.handle : opts.char.name
    const line = `${handle || 'You'}: ${msg}`
    const size = encoder(line)
    if (tokens + size > maxTokens) break

    lines.push(line)
    tokens += size
  }

  const prompt = lines.join('\n')
  return prompt
}

function getMaxTokens(user: AppSchema.User) {
  const type = user.images?.type || 'horde'

  switch (type) {
    case 'novel':
      return 225

    case 'sd':
      return 225

    case 'horde':
    default:
      return 75
  }
}
