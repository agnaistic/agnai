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

  for (const { msg, userId, adapter } of opts.messages.slice().reverse()) {
    if (adapter === 'image') continue
    const indexes = tokenizeMessage(msg)

    let last = ''
    for (const index of indexes.reverse()) {
      const line = msg.slice(index)
      const size = encoder(line)
      tokens += size

      if (tokens > maxTokens) {
        lines.push(last)
        break
      }

      last = line
    }

    if (tokens > maxTokens) break

    const handle =
      (userId ? opts.members.find((pr) => pr.userId === userId)?.handle : opts.char.name) || 'You'
    tokens += encoder(handle + ':')

    if (tokens > maxTokens) {
      lines.push(last)
      break
    }

    lines.push(`${handle}: ${last}`)
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
      return 350

    case 'horde':
    default:
      return 150
  }
}

function tokenizeMessage(line: string) {
  const regex = /[\*\"\?\!\.]/g

  const matches: number[] = []
  let result: RegExpExecArray | null = null

  while ((result = regex.exec(line))) {
    if (result) matches.push(result.index)
    else break
  }

  return matches
}
