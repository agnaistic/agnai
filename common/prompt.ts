import type { AppSchema } from '../srv/db/schema'
import { AIAdapter } from './adapters'
import { getMemoryPrompt } from './memory'
import { defaultPresets, getFallbackPreset, isDefaultPreset } from './presets'
import { getEncoder } from './tokenize'

const DEFAULT_MAX_TOKENS = 2048

export type Prompt = {
  prompt: string
  lines: string[]
  parts: PromptParts
}

export type PromptConfig = {
  adapter: AIAdapter
  model: string
  encoder: (value: string, dialog?: boolean) => number
  lines: string[]
}

export type PromptOpts = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  config: AppSchema.User
  members: AppSchema.Profile[]
  settings?: Partial<AppSchema.GenSettings>
  messages: AppSchema.ChatMessage[]
  retry?: AppSchema.ChatMessage
  continue?: string
  book?: AppSchema.MemoryBook
}

export const BOT_REPLACE = /\{\{char\}\}/g
export const SELF_REPLACE = /\{\{user\}\}/g

export const testBook: AppSchema.MemoryBook = {
  kind: 'memory',
  _id: '',
  name: 'test book',
  userId: '',
  entries: [
    {
      keywords: ['skin colour'],
      priority: 10,
      weight: 5,
      name: '',
      entry: "{{user}}'s skin is blue",
      enabled: true,
    },
    {
      keywords: ['height'],
      priority: 10,
      weight: 5,
      name: '',
      entry: '{{user}} is incredibly small',
      enabled: true,
    },
    {
      keywords: ['foo'],
      priority: 10,
      weight: 4,
      name: '',
      entry: 'Foo bar baz qux',
      enabled: true,
    },
  ],
}

export function createPrompt(opts: PromptOpts) {
  const sortedMsgs = opts.messages.slice().sort(sortMessagesDesc)
  opts.messages = sortedMsgs

  const { settings = defaultPresets.basic } = opts
  const lines = getLinesForPrompt(opts)
  const { adapter, model } = getAdapter(opts.chat, opts.config, opts.settings)
  const encoder = getEncoder(adapter, model)
  const cfg: PromptConfig = {
    adapter,
    model,
    encoder,
    lines,
  }

  const { pre, post, parts } = createPromptSurrounds(opts, cfg)
  const maxContext = settings.maxContextLength || getFallbackPreset(adapter)?.maxContextLength!
  const history: string[] = []

  let tokens = encoder(pre + '\n' + post)

  for (const text of lines) {
    const size = encoder(text + '\n')

    if (size + tokens > maxContext) break

    history.push(text)
    tokens += size
  }

  const prompt = [pre, ...history.reverse(), post].filter(removeEmpty).join('\n')
  const finalContext = encoder(prompt)
  return { lines, prompt, parts }
}

const START_TEXT = '<START>'

export function createPromptSurrounds(
  opts: Pick<PromptOpts, 'chat' | 'char' | 'members' | 'continue'>,
  cfg: PromptConfig
) {
  const { chat, char, members } = opts

  const memory = getMemoryPrompt(opts, cfg)

  const sender = members.find((mem) => mem.userId === chat.userId)?.handle || 'You'

  const parts = getPromptParts(opts)
  const hasStart =
    parts.greeting?.includes(START_TEXT) ||
    chat.sampleChat?.includes(START_TEXT) ||
    chat.scenario?.includes(START_TEXT)

  const pre: string[] = [`${char.name}'s Persona: ${parts.persona}`]

  if (parts.scenario) pre.push(`Scenario: ${parts.scenario}`)

  if (memory?.prompt) {
    pre.push(memory.prompt)
  }

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

export type PromptParts = {
  scenario?: string
  greeting?: string
  sampleChat?: string[]
  persona: string
  gaslight: string
  post: string[]
  gaslightHasChat: boolean
}

export function getPromptParts(
  opts: Pick<PromptOpts, 'chat' | 'char' | 'members' | 'continue' | 'settings'>
) {
  const { chat, char, members } = opts
  const sender = members.find((mem) => mem.userId === chat.userId)?.handle || 'You'

  const replace = (value: string) => placeholderReplace(value, char.name, sender)

  const parts: PromptParts = {
    persona: formatCharacter(char.name, chat.overrides).replace(/\n+/g, ' '),
    post: [],
    gaslight: '',
    gaslightHasChat: false,
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

  const gaslight =
    opts.chat.genSettings?.gaslight || opts.settings?.gaslight || defaultPresets.openai.gaslight

  const sampleChat = parts.sampleChat?.join('\n') || ''
  parts.gaslight = gaslight
    .replace(/\{\{example_dialogue\}\}/g, sampleChat)
    .replace(/\{\{scenario\}\}/g, parts.scenario || '')
    .replace(/\{\{name\}\}/g, char.name)
    .replace(/\<BOT\>/g, char.name)
    .replace(/\{\{char\}\}/g, char.name)
    .replace(/\{\{user\}\}/g, sender)
    .replace(/\{\{personality\}\}/g, formatCharacter(char.name, char.persona))

  /**
   * If the gaslight does not have a sample chat placeholder, but we do have sample chat
   * then will be adding it to the prompt _after_ the gaslight.
   *
   * We will flag that this needs to occur
   *
   * Edit: We will simply remove the sampleChat from the parts since it has already be included in the prompt using the gaslight
   */
  if (gaslight.includes('{{example_dialogue}}')) {
    parts.sampleChat = undefined
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
 * We 'optimistically' get enough tokens to fill up the entire prompt.
 * This is an estimate and will be pruned by the caller.
 *
 * In `createPrompt()`, we trim this down to fit into the context with all of the chat and character context
 */
export function getLinesForPrompt(
  { settings, char, members, messages, retry, continue: cont, book, ...opts }: PromptOpts,
  lines: string[] = []
) {
  const maxContext = settings?.maxContextLength || DEFAULT_MAX_TOKENS
  const { adapter, model } = getAdapter(opts.chat, opts.config, settings)
  const encoder = getEncoder(adapter, model)
  let tokens = 0

  const sender = members.find((mem) => opts.chat.userId === mem.userId)?.handle || 'You'

  const formatMsg = (chat: AppSchema.ChatMessage) => fillPlaceholders(chat, char.name, sender)

  const base = cont ? messages : messages
  const history = base.map(formatMsg)

  for (const hist of history) {
    const nextTokens = encoder(hist)
    if (nextTokens + tokens > maxContext) break
    tokens += nextTokens
    lines.push(hist)
  }

  return lines
}

function fillPlaceholders(chat: AppSchema.ChatMessage, char: string, user: string) {
  const prefix = chat.characterId ? char : user
  const msg = chat.msg.replace(BOT_REPLACE, char).replace(SELF_REPLACE, user)
  return `${prefix}: ${msg}`
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
  let presetName = 'Fallback Preset'

  if (adapter === 'novel') {
    model = config.novelModel
  }

  if (adapter === 'openai') {
    model = preset?.oaiModel || defaultPresets.openai.oaiModel
  }

  if (chat.genPreset) {
    if (isDefaultPreset(chat.genPreset)) {
      presetName = 'Chat, Default Preset'
    } else presetName = 'Chat, User Preset'
  } else if (chat.genSettings) {
    presetName = 'Chat, Preset Settings'
  } else if (config.defaultPresets) {
    const servicePreset = config.defaultPresets[adapter]
    if (servicePreset) {
      const source = servicePreset in defaultPresets ? 'Default' : 'User'
      presetName = `Service, ${source} Preset`
    }
  }

  return { adapter, model, preset: presetName }
}
