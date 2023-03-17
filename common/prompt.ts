import { AppSchema } from '../srv/db/schema'
import { defaultPresets } from './presets'
import { getEncoder } from './tokenize'

const DEFAULT_MAX_TOKENS = 2048

export type PromptOpts = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  config: AppSchema.User
  members: AppSchema.Profile[]
  settings?: AppSchema.GenSettings
  messages: AppSchema.ChatMessage[]
  retry?: AppSchema.ChatMessage
  continue?: string
}

export const BOT_REPLACE = /\{\{char\}\}/g
export const SELF_REPLACE = /\{\{user\}\}/g

export function createPrompt(opts: PromptOpts) {
  const sortedMsgs = opts.messages.slice().sort(sortMessagesDesc)
  opts.messages = sortedMsgs

  const { settings = defaultPresets.basic } = opts
  const { pre, post, parts } = createPromptSurrounds(opts)
  const { adapter, model } = getAdapter(opts.chat, opts.config, opts.settings)
  const maxContext = settings.maxContextLength || defaultPresets.basic.maxContextLength

  const lines = getLinesForPrompt(opts)
  const history: string[] = []

  const encoder = getEncoder(adapter, model)
  let tokens = encoder([pre, post].join('\n')).length

  for (const text of lines) {
    const size = encoder(text).length

    if (size + tokens > maxContext) break

    history.push(text)
    tokens += size
  }

  const prompt = [pre, ...history, post].filter(removeEmpty).join('\n')
  return { lines, prompt, parts }
}

const START_TEXT = '<START>'

export function createPromptSurrounds(
  opts: Pick<PromptOpts, 'chat' | 'char' | 'members' | 'continue'>
) {
  const { chat, char, members } = opts
  const sender = members.find((mem) => mem.userId === chat.userId)?.handle || 'You'

  const parts = getPromptParts(opts)
  const hasStart =
    parts.greeting?.includes(START_TEXT) ||
    chat.sampleChat?.includes(START_TEXT) ||
    chat.scenario?.includes(START_TEXT)

  const pre: string[] = [`${char.name}'s Persona: ${parts.persona}`]

  if (parts.scenario) pre.push(`Scenario: ${parts.scenario}`)
  if (!hasStart) pre.push('<START>')
  if (parts.sampleChat) pre.push(...parts.sampleChat)

  const post = [`${char.name}:`]
  if (opts.continue) {
    post.unshift(`${char.name}: ${opts.continue}`)
  }

  return {
    pre: pre.join('\n').replace(BOT_REPLACE, char.name).replace(SELF_REPLACE, sender),
    post: parts.post.join('\n'),
    parts,
  }
}

type PromptParts = {
  scenario?: string
  greeting?: string
  sampleChat?: string[]
  persona: string
  post: string[]
}

export function getPromptParts(opts: Pick<PromptOpts, 'chat' | 'char' | 'members' | 'continue'>) {
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
      const text = persona.attributes.text?.[0]
      if (text === undefined) {
        throw new Error(
          `Could not format character: Format is 'text', but the attribute is not defined. This may be due to missing data when importing a character.`
        )
      }
      return text
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

/**
 * We 'ambitiously' get enough tokens to fill up the entire prompt.
 *
 * In `createPrompt()`, we trim this down to fit into the context with all of the chat and character context
 */
export function getLinesForPrompt(
  { settings, char, members, messages, retry, continue: cont, ...opts }: PromptOpts,
  lines: string[] = []
) {
  const maxContext = settings?.maxContextLength || DEFAULT_MAX_TOKENS
  const { adapter, model } = getAdapter(opts.chat, opts.config, settings)
  const encoder = getEncoder(adapter, model)
  let tokens = 0

  const formatMsg = (chat: AppSchema.ChatMessage) => prefix(chat, char.name, members) + chat.msg

  const base = cont ? messages : retry ? messages.slice(1) : messages
  const history = base.map(formatMsg)

  for (const hist of history) {
    const nextTokens = encoder(hist).length
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

function sortMessagesDesc(l: AppSchema.ChatMessage, r: AppSchema.ChatMessage) {
  return l.createdAt > r.createdAt ? -1 : l.createdAt === r.createdAt ? 0 : 1
}

export function getAdapter(
  chat: AppSchema.Chat,
  config: AppSchema.User,
  preset?: Partial<AppSchema.GenSettings>
) {
  let adapter = !chat.adapter || chat.adapter === 'default' ? config.defaultAdapter : chat.adapter
  let model = ''

  if (adapter === 'novel') {
    model = config.novelModel
  }

  if (adapter === 'openai') {
    model = preset?.oaiModel || defaultPresets.openai.oaiModel
  }

  return { adapter, model }
}
