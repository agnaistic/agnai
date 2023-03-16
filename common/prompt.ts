import gpt from 'gpt-3-encoder'
import { AppSchema } from '../srv/db/schema'
import { defaultPresets } from './presets'

const DEFAULT_MAX_TOKENS = 2048

export type PromptOpts = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  members: AppSchema.Profile[]
  settings?: AppSchema.GenSettings
  messages: AppSchema.ChatMessage[]
  retry?: AppSchema.ChatMessage
  continue?: string
}

export const BOT_REPLACE = /\{\{char\}\}/g
export const SELF_REPLACE = /\{\{user\}\}/g

export function createPrompt(opts: PromptOpts) {
  const { chat, char, members, settings = defaultPresets.basic, messages, retry } = opts
  const { pre, post } = createPromptSurrounds(opts)
  const maxContext = settings.maxContextLength || defaultPresets.basic.maxContextLength

  const lines = getLinesForPrompt(opts)
  const history: string[] = []
  let tokens = gpt.encode([pre, post].join('\n')).length

  for (const text of lines) {
    const size = gpt.encode(text).length

    if (size + tokens > maxContext) break

    history.push(text)
    tokens += size
  }

  const prompt = [pre, ...history, post].filter(removeEmpty).join('\n')
  return { lines, prompt }
}

function getHandle(members: AppSchema.Profile[], id?: string) {
  if (!id) return 'You'

  for (const mem of members) {
    if (mem.userId === id) return mem.handle || 'You'
  }

  return 'You'
}

export function createPromptSurrounds(
  opts: Pick<PromptOpts, 'chat' | 'char' | 'members' | 'continue'>
) {
  const { chat, char, members } = opts
  const sender = members.find((mem) => mem.userId === chat.userId)?.handle || 'You'

  const hasStartSignal =
    chat.scenario.includes('<START>') ||
    chat.sampleChat.includes('<START>') ||
    chat.greeting.includes('<START>')

  const pre: string[] = [`${char.name}'s Persona: ${formatCharacter(char.name, chat.overrides)}`]

  if (chat.scenario) pre.push(`Scenario: ${chat.scenario}`)

  if (!hasStartSignal) pre.push('<START>')

  const sampleChat = chat.sampleChat.split('\n').filter(removeEmpty)
  pre.push(...sampleChat)

  const post = [`${char.name}:`]
  if (opts.continue) {
    post.unshift(`${char.name}: ${opts.continue}`)
  }

  return {
    pre: pre.join('\n').replace(BOT_REPLACE, char.name).replace(SELF_REPLACE, sender),
    post: `${char.name}:`,
  }
}

type PromptParts = {
  scenario?: string
  greeting?: string
  sampleChat?: string[]
  persona: string
  post: string[]
}

export function getPromptParts(
  opts: Pick<PromptOpts, 'chat' | 'char' | 'members' | 'continue'>,
  personaKind?: AppSchema.CharacterPersona['kind']
) {
  const { chat, char, members } = opts
  const sender = members.find((mem) => mem.userId === chat.userId)?.handle || 'You'

  const replace = (value: string) => placeholderReplace(value, char.name, sender)

  const parts: PromptParts = {
    persona: formatCharacter(char.name, chat.overrides),
    post: [],
  }

  if (chat.scenario) {
    parts.scenario = replace(chat.scenario)
  }

  if (chat.sampleChat) {
    parts.sampleChat = chat.sampleChat.split('\n').filter(removeEmpty).map(replace)
  }

  if (chat.greeting) {
    parts.greeting = replace(chat.greeting)
  }

  const post = [`${char.name}:`]
  if (opts.continue) {
    post.unshift(`${char.name}: ${opts.continue}`)
  }

  parts.post = post.map(replace)

  return parts
}

function placeholderReplace(value: string, charName: string, senderName: string) {
  return value.replace(BOT_REPLACE, charName).replace(SELF_REPLACE, senderName)
}

export function formatCharacter(name: string, persona: AppSchema.CharacterPersona) {
  switch (persona.kind) {
    case 'wpp': {
      const attrs = Object.entries(persona.attributes)
        .map(([key, values]) => `${key}(${values.map(quote).join(' + ')})`)
        .join('\n')

      return [`[character("${name}") {`, attrs, '}]'].join('\n')
    }

    case 'sbf': {
      const attrs = Object.entries(persona.attributes).map(
        ([key, values]) => `${key}: ${values.map(quote).join(', ')}`
      )

      return `[ character: "${name}"; ${attrs.join('; ')} ]`
    }

    case 'boostyle': {
      const attrs = Object.values(persona.attributes).reduce(
        (prev, curr) => {
          prev.push(...curr)
          return prev
        },
        [name]
      )
      return attrs.join(' + ')
    }

    case 'text': {
      return persona.attributes.text[0]
    }
  }
}

export function exportCharacter(char: AppSchema.Character, target: 'tavern' | 'ooba') {
  switch (target) {
    case 'tavern': {
      return {
        name: char.name,
        first_mes: char.greeting,
        scenario: char.scenario,
        description: formatCharacter(char.name, char.persona),
        mes_example: char.sampleChat,
      }
    }

    case 'ooba': {
      return {
        char_name: char.name,
        char_greeting: char.greeting,
        world_scenario: char.scenario,
        char_persona: formatCharacter(char.name, char.persona),
        example_dialogue: char.sampleChat,
      }
    }
  }
}

function quote(str: string) {
  return `"${str}"`
}

function removeEmpty(value?: string) {
  return !!value
}

function sortDesc(left: AppSchema.ChatMessage, right: AppSchema.ChatMessage) {
  return left.createdAt > right.createdAt ? 1 : left.createdAt === right.createdAt ? 0 : -1
}

/**
 * We 'ambitiously' get enough tokens to fill up the entire prompt.
 *
 * In `createPrompt()`, we trim this down to fit into the context with all of the chat and character context
 */
export function getLinesForPrompt(
  { chat, settings, char, members, messages }: PromptOpts,
  lines: string[] = []
) {
  const maxContext = settings?.maxContextLength || DEFAULT_MAX_TOKENS
  let tokens = 0

  const formatMsg = (chat: AppSchema.ChatMessage) => prefix(chat, char.name, members) + chat.msg

  const history = messages.map(formatMsg)

  for (const hist of history) {
    const nextTokens = gpt.encode(hist).length
    if (nextTokens + tokens > maxContext) break
    tokens += nextTokens
    lines.unshift(hist)
  }

  return lines
}

function prefix(chat: AppSchema.ChatMessage, bot: string, members: AppSchema.Profile[]) {
  const member = members.find((mem) => chat.userId === mem.userId)

  return chat.characterId ? `${bot}: ` : `${member?.handle}: `
}
