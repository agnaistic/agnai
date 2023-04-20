import { GenerateRequestV2 } from '../srv/adapter/type'
import type { AppSchema } from '../srv/db/schema'
import { AIAdapter, OPENAI_MODELS } from './adapters'
import { getMemoryPrompt, MemoryPrompt, MEMORY_PREFIX } from './memory'
import { defaultPresets, getFallbackPreset, isDefaultPreset } from './presets'
import { Encoder, getEncoder } from './tokenize'

export type Prompt = {
  prompt: string
  lines: string[]
  parts: PromptParts
}

export type PromptConfig = {
  adapter: AIAdapter
  model: string
  encoder: Encoder
  lines: string[]
}

export type PromptOpts = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  user: AppSchema.User
  members: AppSchema.Profile[]
  settings?: Partial<AppSchema.GenSettings>
  messages: AppSchema.ChatMessage[]
  retry?: AppSchema.ChatMessage
  continue?: string
  book?: AppSchema.MemoryBook
}

export const BOT_REPLACE = /\{\{char\}\}/g
export const SELF_REPLACE = /\{\{user\}\}/g

/**
 * This is only ever invoked client-side
 * @param opts
 * @returns
 */
export function createPrompt(opts: PromptOpts) {
  const sortedMsgs = opts.messages
    .filter((msg) => msg.adapter !== 'image')
    .slice()
    .sort(sortMessagesDesc)
  opts.messages = sortedMsgs

  /**
   * The lines from `getLinesForPrompt` are returned in time-descending order
   */
  const lines = getLinesForPrompt(opts)
  const parts = getPromptParts(opts, lines)
  const { pre, post, history, prompt } = buildPrompt(opts, parts, lines, 'desc')
  return { prompt, lines: lines.reverse(), pre, post, parts, history }
}

const START_TEXT = '<START>'

/**
 * This is only ever invoked server-side
 *
 * @param opts
 * @param parts
 * @param lines Always in time-ascending order (oldest to newest)
 * @returns
 */
export function createPromptWithParts(
  opts: Pick<GenerateRequestV2, 'chat' | 'char' | 'members' | 'settings' | 'user'>,
  parts: PromptParts,
  lines: string[]
) {
  const { pre, post, history } = buildPrompt(opts, parts, lines, 'asc')
  const prompt = [pre, history, post].filter(removeEmpty).join('\n')
  return { lines, prompt, parts, pre, post }
}

type BuildPromptOpts = {
  chat: AppSchema.Chat
  char: AppSchema.Character
  user: AppSchema.User
  continue?: string
  members: AppSchema.Profile[]
  settings?: Partial<AppSchema.GenSettings>
}

/**
 * @param lines
 * @param order The incoming order of the lines by time. asc = time oldest->newest, desc = newest->oldest. This affects whether the history is reversed before being returned
 * @returns
 */
export function buildPrompt(
  opts: BuildPromptOpts,
  parts: PromptParts,
  incomingLines: string[],
  order: 'asc' | 'desc'
) {
  const lines = order === 'asc' ? incomingLines.slice().reverse() : incomingLines.slice()
  const { chat, char } = opts
  const user = opts.members.find((mem) => mem.userId === chat.userId)
  const sender = user?.handle || 'You'

  const hasStart =
    parts.greeting?.includes(START_TEXT) ||
    chat.sampleChat?.includes(START_TEXT) ||
    chat.scenario?.includes(START_TEXT)

  const pre: string[] = []

  // If the gaslight is empty or useGaslight is disabled, proceed without it
  if (!opts.settings?.useGaslight || !opts.settings.gaslight || !parts.gaslight) {
    pre.push(`${char.name}'s Persona: ${parts.persona}`)

    if (parts.scenario) pre.push(`Scenario: ${parts.scenario}`)

    if (parts.memory?.prompt) {
      pre.push(`${MEMORY_PREFIX}${parts.memory.prompt}`)
    }

    if (!hasStart) pre.push('<START>')

    if (parts.sampleChat) pre.push(...parts.sampleChat)
  }

  // Only use the gaslight if specifically configured to and when it exists.
  if (opts.settings?.useGaslight && opts.settings?.gaslight && parts.gaslight) {
    pre.push(parts.gaslight)
  }

  const post = [`${char.name}:`]
  if (opts.continue) {
    post.unshift(`${char.name}: ${opts.continue}`)
  }

  const { adapter, model } = getAdapter(opts.chat, opts.user, opts.settings)
  const encoder = getEncoder(adapter, model)

  const maxContext = getContextLimit(opts.settings, adapter, model)

  const preamble = pre.join('\n').replace(BOT_REPLACE, char.name).replace(SELF_REPLACE, sender)
  const postamble = parts.post.join('\n')
  const history = fillPromptWithLines(
    encoder,
    maxContext,
    preamble + '\n' + postamble,
    lines
  ).reverse()

  /**
   * TODO: This is doubling up on memory a fair bit
   * This is left like this for 'prompt re-ordering'
   * However the prompt re-ordering should probably occur earlier
   */

  const prompt = [preamble, ...history, postamble].filter(removeEmpty).join('\n')

  return {
    pre: preamble,
    post: postamble,
    history: history.join('\n'),
    parts,
    prompt,
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
  memory?: MemoryPrompt
}

export function getPromptParts(
  opts: Pick<PromptOpts, 'chat' | 'char' | 'members' | 'continue' | 'settings' | 'user' | 'book'>,
  lines: string[]
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

  parts.memory = getMemoryPrompt({ ...opts, lines: lines.slice().reverse() })

  const gaslight = opts.settings?.gaslight || defaultPresets.openai.gaslight

  const sampleChat = parts.sampleChat?.join('\n') || ''
  parts.gaslight = gaslight
    .replace(/\{\{example_dialogue\}\}/g, sampleChat)
    .replace(/\{\{scenario\}\}/g, parts.scenario || '')
    .replace(/\{\{memory\}\}/g, parts.memory?.prompt || '')
    .replace(/\{\{name\}\}/g, char.name)
    .replace(/\<BOT\>/g, char.name)
    .replace(/\{\{personality\}\}/g, formatCharacter(char.name, chat.overrides || char.persona))
    .replace(/\{\{char\}\}/g, char.name)
    .replace(/\{\{user\}\}/g, sender)

  /**
   * If the gaslight does not have a sample chat placeholder, but we do have sample chat
   * then will be adding it to the prompt _after_ the gaslight.
   *
   * We will flag that this needs to occur
   *
   * Edit: We will simply remove the sampleChat from the parts since it has already be included in the prompt using the gaslight
   */
  const { adapter, model } = getAdapter(opts.chat, opts.user, opts.settings)
  if (
    gaslight.includes('{{example_dialogue}}') &&
    adapter === 'openai' &&
    model === (OPENAI_MODELS.Turbo || model === OPENAI_MODELS.GPT4)
  ) {
    parts.sampleChat = undefined
  }

  parts.post = post.map(replace)

  return parts
}

function placeholderReplace(value: string, charName: string, senderName: string) {
  return value.replace(BOT_REPLACE, charName).replace(SELF_REPLACE, senderName)
}

export function formatCharacter(name: string, persona: AppSchema.Persona) {
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
function getLinesForPrompt({
  settings,
  char,
  members,
  messages,
  continue: cont,
  book,
  ...opts
}: PromptOpts) {
  const { adapter, model } = getAdapter(opts.chat, opts.user, settings)
  const maxContext = getContextLimit(settings, adapter, model)

  const encoder = getEncoder(adapter, model)

  const profiles = new Map<string, AppSchema.Profile>()
  for (const member of members) {
    profiles.set(member.userId, member)
  }

  const formatMsg = (chat: AppSchema.ChatMessage) =>
    fillPlaceholders(chat, char.name, profiles.get(chat.userId!)?.handle || 'You').trim()

  const history = messages.slice().sort(sortMessagesDesc).map(formatMsg)

  const lines = fillPromptWithLines(encoder, maxContext, '', history)
  return lines
}

function fillPromptWithLines(encoder: Encoder, tokenLimit: number, amble: string, lines: string[]) {
  let count = encoder(amble)
  const adding: string[] = []

  for (const line of lines) {
    const tokens = encoder(line)
    if (tokens + count > tokenLimit) {
      return adding
    }

    count += tokens
    adding.push(line)
  }

  return adding
}

function fillPlaceholders(chat: AppSchema.ChatMessage, char: string, user: string) {
  const prefix = chat.characterId ? char : user
  const msg = chat.msg.replace(BOT_REPLACE, char).replace(SELF_REPLACE, user)
  return `${prefix}: ${msg}`
}

function sortMessagesDesc(l: AppSchema.ChatMessage, r: AppSchema.ChatMessage) {
  return l.createdAt > r.createdAt ? -1 : l.createdAt === r.createdAt ? 0 : 1
}

const THIRD_PARTY_ADAPTERS: { [key in AIAdapter]?: boolean } = {
  openai: true,
  claude: true,
}

export function getChatPreset(
  chat: AppSchema.Chat,
  user: AppSchema.User,
  userPresets: AppSchema.UserGenPreset[]
) {
  /**
   * Order of precedence:
   * 1. chat.genPreset
   * 2. chat.genSettings
   * 3. user.servicePreset
   * 4. service fallback preset
   */

  // #1
  if (chat.genPreset) {
    if (isDefaultPreset(chat.genPreset)) return defaultPresets[chat.genPreset]

    const preset = userPresets.find((preset) => preset._id === chat.genPreset)
    if (preset) return preset
  }

  // #2
  if (chat.genSettings) {
    return chat.genSettings
  }

  // #3
  const { adapter, isThirdParty } = getAdapter(chat, user)
  const fallbackId = user.defaultPresets?.[isThirdParty ? 'kobold' : adapter]

  if (fallbackId) {
    if (isDefaultPreset(fallbackId)) return defaultPresets[fallbackId]
    const preset = userPresets.find((preset) => preset._id === fallbackId)
    if (preset) return preset
  }

  // #4
  return getFallbackPreset(adapter)
}

export function getAdapter(
  chat: AppSchema.Chat,
  config: AppSchema.User,
  preset?: Partial<AppSchema.GenSettings>
) {
  const chatAdapter =
    !chat.adapter || chat.adapter === 'default' ? config.defaultAdapter : chat.adapter

  const isThirdParty = THIRD_PARTY_ADAPTERS[config.thirdPartyFormat] && chatAdapter === 'kobold'

  const adapter = chatAdapter === 'kobold' && isThirdParty ? config.thirdPartyFormat : chatAdapter

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

  const contextLimit = getContextLimit(preset, adapter, model)

  return { adapter, model, preset: presetName, contextLimit, isThirdParty }
}

/**
 * When we know the maximum context limit for a particular LLM, ensure that the context limit we use does not exceed it.
 */
function getContextLimit(
  gen: Partial<AppSchema.GenSettings> | undefined,
  adapter: AIAdapter,
  model: string
): number {
  const configuredMax =
    gen?.maxContextLength || getFallbackPreset(adapter)?.maxContextLength || 2048

  const genAmount = gen?.maxTokens || getFallbackPreset(adapter)?.maxTokens || 80

  switch (adapter) {
    case 'chai':
      return Math.min(2048, configuredMax) - genAmount

    // Any LLM could be used here so don't max any assumptions
    case 'kobold':
    case 'luminai':
    case 'ooba':
      return configuredMax - genAmount

    case 'novel':
    case 'horde':
      return Math.min(2048, configuredMax) - genAmount

    case 'openai': {
      if (!model || model === OPENAI_MODELS.Turbo || model === OPENAI_MODELS.DaVinci)
        return 4096 - genAmount
      return configuredMax - genAmount
    }

    case 'scale':
      return configuredMax - genAmount

    case 'claude':
      return configuredMax - genAmount

    default:
      throw new Error(`Unknown adapter: ${adapter}`)
  }
}
