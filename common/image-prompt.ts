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

    const handle = userId ? opts.members.find((pr) => pr.userId === userId)?.handle : opts.char.name
    tokens += encoder(handle + ':')

    if (tokens > maxTokens) {
      lines.push(last.trim())
      break
    }

    lines.push(`${handle || 'You'}: ${last}`.trim())
  }

  const profile = opts.members.find((mem) => mem.userId === opts.user._id)
  const prompt = lines
    .reverse()
    .join('\n')
    .replace(/\s+/g, ' ')
    .replace(BOT_REPLACE, opts.char.name)
    .replace(SELF_REPLACE, profile?.handle || 'You')

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

  const matches: number[] = [0]
  let result: RegExpExecArray | null = null

  while ((result = regex.exec(line))) {
    if (result) matches.push(result.index + 1)
    else break
  }

  return matches
}
