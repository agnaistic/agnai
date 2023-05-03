import { AppSchema } from '../srv/db/schema'
import { formatCharacter } from './prompt'
import { tokenize } from './tokenize'
import { BOT_REPLACE, SELF_REPLACE } from './prompt'

export type ImagePromptOpts = {
  user: AppSchema.User
  messages: AppSchema.ChatMessage[]
  members: AppSchema.Profile[]
  char: AppSchema.Character
}

const appearanceKeys = ['appearance', 'looks']

export function createAppearancePrompt(avatar: AppSchema.Chat | AppSchema.Character) {
  let visuals = ''

  const persona = avatar.kind === 'character' ? avatar.persona : avatar.overrides

  for (const key of appearanceKeys) {
    if (persona.kind === 'text') break

    const value = persona.attributes[key]
    if (!value) continue

    visuals = value.join(', ')
    break
  }

  if (!visuals) {
    visuals = formatCharacter('', persona, 'boostyle').replace(/ \+ /g, ', ')
  }

  const prompt = `full body portrait, ${visuals}, dramatic lighting`
  console.log(prompt)
  return prompt
}

export async function createImagePrompt(opts: ImagePromptOpts) {
  const maxTokens = getMaxTokens(opts.user)

  /**
   * TODO: Use chat summarization when available
   */

  const lines: string[] = []
  let tokens = 0

  for (const { msg, userId, adapter } of opts.messages.slice().reverse()) {
    if (adapter === 'image') continue
    const indexes = tokenizeMessage(msg)

    let last = ''

    for (const index of indexes.reverse()) {
      const line = msg.slice(index)
      const size = await tokenize(line)
      tokens += size

      if (tokens > maxTokens) {
        lines.push(last)
        break
      }

      last = line
    }

    if (tokens > maxTokens) break

    const handle = userId ? opts.members.find((pr) => pr.userId === userId)?.handle : opts.char.name
    tokens += await tokenize(handle + ':')

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
      return 500

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
