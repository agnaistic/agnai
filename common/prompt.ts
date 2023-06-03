import type { GenerateRequestV2 } from '../srv/adapter/type'
import type { AppSchema } from '../srv/db/schema'
import { AIAdapter, NOVEL_MODELS, OPENAI_CHAT_MODELS, OPENAI_MODELS } from './adapters'
import { adventureTemplate, defaultTemplate } from './default-preset'
import { IMAGE_SUMMARY_PROMPT } from './image'
import { buildMemoryPrompt } from './memory'
import { defaultPresets, getFallbackPreset, isDefaultPreset } from './presets'
import { Encoder } from './tokenize'

export type PromptParts = {
  scenario?: string
  greeting?: string
  sampleChat?: string[]
  persona: string
  gaslight: string
  ujb?: string
  post: string[]
  gaslightHasChat: boolean
  memory?: string
}

type Placeholder =
  | Exclude<keyof PromptParts, 'gaslightHasChat' | 'gaslight' | 'greeting'>
  | 'history'

export type Prompt = {
  template: string
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
  kind?: GenerateRequestV2['kind']
  chat: AppSchema.Chat
  char: AppSchema.Character
  user: AppSchema.User
  members: AppSchema.Profile[]
  settings?: Partial<AppSchema.GenSettings>
  messages: AppSchema.ChatMessage[]
  retry?: AppSchema.ChatMessage
  continue?: string
  book?: AppSchema.MemoryBook
  replyAs: AppSchema.Character
  characters: GenerateRequestV2['characters']
  impersonate?: AppSchema.Character
}

type BuildPromptOpts = {
  kind?: GenerateRequestV2['kind']
  chat: AppSchema.Chat
  char: AppSchema.Character
  replyAs: AppSchema.Character
  user: AppSchema.User
  continue?: string
  members: AppSchema.Profile[]
  settings?: Partial<AppSchema.GenSettings>
  impersonate?: AppSchema.Character
}

/** {{user}}, <user>, {{char}}, <bot>, case insensitive */
export const BOT_REPLACE = /(\{\{char\}\}|<BOT>|\{\{name\}\})/gi
export const SELF_REPLACE = /(\{\{user\}\}|<USER>)/gi

const HOLDER_NAMES = {
  ujb: 'ujb',
  sampleChat: 'example_dialogue',
  persona: 'personality',
  memory: 'memory',
  post: 'post',
  scenario: 'scenario',
  history: 'history',
} satisfies Record<Placeholder, string>

const HOLDERS = {
  ujb: /\{\{ujb\}\}/gi,
  sampleChat: /\{\{example_dialogue\}\}/gi,
  scenario: /\{\{scenario\}\}/gi,
  memory: /\{\{memory\}\}/gi,
  persona: /\{\{personality\}\}/gi,
  post: /\{\{post\}\}/gi,
  history: /\{\{history\}\}/gi,
} satisfies Record<Placeholder, RegExp>

const ALL_HOLDERS = new RegExp(
  '(' +
    Object.values(HOLDER_NAMES)
      .map((key) => `\{\{${key}\}\}`)
      .join('|') +
    ')',
  'gi'
)

/**
 * This is only ever invoked client-side
 * @param opts
 * @returns
 */
export function createPrompt(opts: PromptOpts, encoder: Encoder) {
  const sortedMsgs = opts.messages
    .filter((msg) => msg.adapter !== 'image')
    .slice()
    .sort(sortMessagesDesc)
  opts.messages = sortedMsgs

  /**
   * The lines from `getLinesForPrompt` are returned in time-descending order
   */
  const lines = getLinesForPrompt(opts, encoder)
  const parts = getPromptParts(opts, lines, encoder)
  const template = getTemplate(opts, parts)
  const prompt = injectPlaceholders(template, {
    opts,
    parts,
    history: { lines, order: 'desc' },
    encoder,
  })
  return { lines: lines.reverse(), parts, template: prompt }
}

/**
 * This is only ever invoked server-side
 *
 * @param opts
 * @param parts
 * @param lines Always in time-ascending order (oldest to newest)
 * @returns
 */
export function createPromptWithParts(
  opts: Pick<
    GenerateRequestV2,
    'chat' | 'char' | 'members' | 'settings' | 'user' | 'replyAs' | 'characters' | 'impersonate'
  >,
  parts: PromptParts,
  lines: string[],
  encoder: Encoder
) {
  const post = createPostPrompt(opts)
  const template = getTemplate(opts, parts)
  const prompt = injectPlaceholders(template, {
    opts,
    parts,
    history: { lines, order: 'asc' },
    encoder,
  })
  return { lines, prompt, parts, post }
}

export function getTemplate(
  opts: Pick<GenerateRequestV2, 'settings' | 'chat'>,
  parts: PromptParts
) {
  const isChat = OPENAI_CHAT_MODELS[opts.settings?.oaiModel || ''] ?? false
  const useGaslight = (opts.settings?.service === 'openai' && isChat) || opts.settings?.useGaslight
  const gaslight = opts.settings?.gaslight || defaultPresets.openai.gaslight

  const template = useGaslight
    ? gaslight
    : opts.chat.mode === 'adventure'
    ? adventureTemplate
    : defaultTemplate

  return ensureValidTemplate(template, parts)
}

type InjectOpts = {
  opts: BuildPromptOpts
  parts: PromptParts
  history?: { lines: string[]; order: 'asc' | 'desc' }
  encoder: Encoder
}

export function injectPlaceholders(
  template: string,
  { opts, parts, history: hist, encoder }: InjectOpts
) {
  const sampleChat = parts.sampleChat?.join('\n')
  const sender =
    opts.impersonate?.name ||
    opts.members.find((mem) => mem.userId === opts.chat.userId)?.handle ||
    'You'

  let prompt = template
    // UJB must be first to replace placeholders within the UJB
    .replace(HOLDERS.ujb, opts.settings?.ultimeJailbreak || '')
    .replace(HOLDERS.sampleChat, newline(sampleChat))
    .replace(HOLDERS.scenario, parts.scenario || '')
    .replace(HOLDERS.memory, newline(parts.memory))
    .replace(HOLDERS.persona, parts.persona)
    .replace(HOLDERS.post, parts.post.join('\n'))
    // All placeholders support {{char}} and {{user}} placeholders therefore these must be last
    .replace(BOT_REPLACE, opts.replyAs.name)
    .replace(SELF_REPLACE, sender)

  if (hist) {
    const messages = hist.order === 'asc' ? hist.lines.slice().reverse() : hist.lines.slice()
    const { adapter, model } = getAdapter(opts.chat, opts.user, opts.settings)
    const maxContext = getContextLimit(opts.settings, adapter, model)
    const history = fillPromptWithLines(encoder, maxContext, prompt, messages).reverse()
    prompt = prompt.replace(HOLDERS.history, history.join('\n'))
  }

  return prompt
}

function removeUnusedPlaceholders(template: string, parts: PromptParts) {
  const useUjb = !!parts.ujb
  const useSampleChat = !!parts.sampleChat?.join('\n')
  const useMemory = !!parts.memory
  const useScenario = !!parts.scenario

  let modified = template
    .split('\n')
    .filter((line) => {
      const match = line.match(ALL_HOLDERS)
      const hasMultiple = (match?.length ?? 0) > 1
      if (hasMultiple) {
        return true
      }

      if (!useUjb && line.match(HOLDERS.ujb)) return false
      if (!useSampleChat && line.match(HOLDERS.sampleChat)) return false
      if (!useMemory && line.match(HOLDERS.memory)) return false
      if (!useScenario && line.match(HOLDERS.scenario)) return false
      return true
    })
    .join('\n')

  return modified
}

export function ensureValidTemplate(
  template: string,
  parts: PromptParts,
  skip?: Array<'history' | 'post' | 'persona' | 'scenario'>
) {
  const bypass = new Set(skip || [])
  let hasScenario = !!template.match(HOLDERS.scenario)
  let hasPersona = !!template.match(HOLDERS.persona)
  let hasHistory = !!template.match(HOLDERS.history)
  let hasPost = !!template.match(HOLDERS.post)

  const useScenario = !!parts.scenario
  const usePersona = !!parts.persona

  let modified = removeUnusedPlaceholders(template, parts)

  if (!bypass.has('scenario') && !hasScenario && useScenario) {
    hasScenario = true
    modified += `\nScenario: {{${HOLDER_NAMES.scenario}}}`
  }

  if (!bypass.has('persona') && !hasPersona && usePersona) {
    hasScenario = true
    modified += `\n{{char}}'s persona: {{${HOLDER_NAMES.persona}}}`
  }

  if (!bypass.has('post') && !bypass.has('history') && !hasHistory && !hasPost) {
    modified += `\n{{history}}\n{{post}}`
  } else if (!bypass.has('history') && !hasHistory && hasPost) {
    modified.replace(HOLDERS.post, `{{${HOLDER_NAMES.history}}}\n{{${HOLDER_NAMES.post}}}`)
  } else if (!bypass.has('post') && hasHistory && !hasPost) {
    modified += '\n{{post}}'
  }

  return modified
}

type PromptPartsOptions = Pick<
  PromptOpts,
  | 'kind'
  | 'chat'
  | 'char'
  | 'members'
  | 'continue'
  | 'settings'
  | 'user'
  | 'book'
  | 'replyAs'
  | 'impersonate'
>

export function getPromptParts(opts: PromptPartsOptions, lines: string[], encoder: Encoder) {
  const { chat, char, members, replyAs } = opts
  const sender = opts.impersonate
    ? opts.impersonate.name
    : members.find((mem) => mem.userId === chat.userId)?.handle || 'You'

  const replace = (value: string) => placeholderReplace(value, opts.replyAs.name, sender)

  const parts: PromptParts = {
    persona: formatCharacter(
      replyAs.name,
      replyAs._id === char._id ? chat.overrides : replyAs.persona
    ),
    post: [],
    gaslight: '',
    gaslightHasChat: false,
  }

  if (chat.scenario) {
    parts.scenario = chat.scenario.replace(BOT_REPLACE, char.name)
  }

  parts.sampleChat = (replyAs._id === char._id ? chat.sampleChat : replyAs.sampleChat)
    .split('\n')
    .filter(removeEmpty)
    // This will use the 'replyAs' character "if present", otherwise it'll defer to the chat.character.name
    .map(replace)

  if (chat.greeting) {
    parts.greeting = replace(chat.greeting)
  }

  const post = createPostPrompt(opts)

  if (opts.continue) {
    post.unshift(`${char.name}: ${opts.continue}`)
  }

  const memory = buildMemoryPrompt({ ...opts, lines: lines.slice().reverse() }, encoder)
  if (memory) parts.memory = memory.prompt

  const gaslight = opts.settings?.gaslight || defaultPresets.openai.gaslight
  const ujb = opts.settings?.ultimeJailbreak

  const injectOpts = { opts, parts, encoder }

  if (ujb) {
    parts.ujb = injectPlaceholders(removeUnusedPlaceholders(ujb, parts), injectOpts)
  }

  parts.gaslight = injectPlaceholders(removeUnusedPlaceholders(gaslight, parts), injectOpts)

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

function createPostPrompt(
  opts: Pick<
    PromptOpts,
    | 'kind'
    | 'chat'
    | 'char'
    | 'members'
    | 'continue'
    | 'settings'
    | 'user'
    | 'book'
    | 'replyAs'
    | 'impersonate'
  >
) {
  const post = []
  if (opts.kind === 'summary') {
    let text = opts.user.images?.summaryPrompt || IMAGE_SUMMARY_PROMPT.other
    if (!text.startsWith('(')) text = '(' + text
    if (!text.endsWith(')')) text += ')'
    post.push(`System: ${text}\nSummary:`)
  } else {
    post.push(`${opts.replyAs.name}:`)
  }
  return post
}

function placeholderReplace(value: string, charName: string, senderName: string) {
  return value.replace(BOT_REPLACE, charName).replace(SELF_REPLACE, senderName)
}

export function formatCharacter(
  name: string,
  persona: AppSchema.Persona,
  kind?: AppSchema.Persona['kind']
) {
  switch (kind || persona.kind) {
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
      return text || ''
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
        personality: formatCharacter(char.name, char.persona),
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
function getLinesForPrompt(
  { settings, char, members, messages, continue: cont, book, ...opts }: PromptOpts,
  encoder: Encoder
) {
  const { adapter, model } = getAdapter(opts.chat, opts.user, settings)
  const maxContext = getContextLimit(settings, adapter, model)

  const profiles = new Map<string, AppSchema.Profile>()
  for (const member of members) {
    profiles.set(member.userId, member)
  }

  const formatMsg = (chat: AppSchema.ChatMessage) => {
    const sender = opts.impersonate
      ? opts.impersonate.name
      : profiles.get(chat.userId || opts.chat.userId)?.handle || 'You'

    return fillPlaceholders(
      chat,
      opts.characters[chat.characterId!]?.name || char.name,
      sender
    ).trim()
  }

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
): Partial<AppSchema.GenSettings> {
  /**
   * Order of precedence:
   * 1. chat.genPreset
   * 2. chat.genSettings
   * 3. user.defaultPreset
   * 4. user.servicePreset -- Deprecated: Service presets are completely removed apart from users that already have them.
   * 5. built-in fallback preset (horde)
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
  const defaultId = user.defaultPreset
  if (defaultId) {
    if (isDefaultPreset(defaultId)) return defaultPresets[defaultId]
    const preset = userPresets.find((preset) => preset._id === defaultId)
    if (preset) return preset
  }

  // #4
  const { adapter, isThirdParty } = getAdapter(chat, user)
  const fallbackId = user.defaultPresets?.[isThirdParty ? 'kobold' : adapter]

  if (fallbackId) {
    if (isDefaultPreset(fallbackId)) return defaultPresets[fallbackId]
    const preset = userPresets.find((preset) => preset._id === fallbackId)
    if (preset) return preset
  }

  // #5
  return getFallbackPreset(adapter)
}

/**
 * Order of Precedence:
 * 1. chat.genPreset -> service
 * 2. chat.genSettings -> service
 * 3. chat.adapter
 * 4. user.defaultAdapter
 */
export function getAdapter(
  chat: AppSchema.Chat,
  config: AppSchema.User,
  preset?: Partial<AppSchema.GenSettings>
) {
  const chatAdapter =
    !chat.adapter || chat.adapter === 'default' ? config.defaultAdapter : chat.adapter

  let adapter = preset?.service ? preset.service : chatAdapter
  const isThirdParty = THIRD_PARTY_ADAPTERS[config.thirdPartyFormat] && adapter === 'kobold'

  if (adapter === 'kobold' && THIRD_PARTY_ADAPTERS[config.thirdPartyFormat]) {
    adapter = config.thirdPartyFormat
  }

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
      presetName = 'Built-in Preset'
    } else presetName = 'User Preset'
  } else if (chat.genSettings) {
    presetName = 'Chat Settings'
  } else if (config.defaultPresets) {
    const servicePreset = config.defaultPresets[adapter]
    if (servicePreset) {
      presetName = `Service Preset`
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
    // Any LLM could be used here so don't max any assumptions
    case 'kobold':
    case 'luminai':
    case 'ooba':
      return configuredMax - genAmount

    case 'novel': {
      if (model === NOVEL_MODELS.clio_v1) return 8000 - genAmount
      return configuredMax - genAmount
    }

    case 'horde':

    case 'openai': {
      const models = new Set<string>([
        OPENAI_MODELS.Turbo,
        OPENAI_MODELS.Turbo0301,
        OPENAI_MODELS.DaVinci,
      ])

      if (!model || models.has(model)) return 4095 - genAmount
      return configuredMax - genAmount
    }

    case 'scale':
      return configuredMax - genAmount

    case 'claude':
      return configuredMax - genAmount

    case 'goose':
      return 2048 - genAmount
  }
}

export type TrimOpts = {
  input: string | string[]

  /**
   * Which direction to start counting from.
   *
   * I.e.,
   * - If 'top', the bottom of the text will be trimmed
   * - If 'bottom', the top of the text will be trimed
   */
  start: 'top' | 'bottom'
  encoder: Encoder
  tokenLimit: number
}

/**
 * Remove lines from a body of text that contains line breaks
 */
export function trimTokens(opts: TrimOpts) {
  const text = Array.isArray(opts.input) ? opts.input.slice() : opts.input.split('\n')
  if (opts.start === 'bottom') text.reverse()

  let tokens = 0
  let output: string[] = []

  for (const line of text) {
    tokens += opts.encoder(line)
    if (tokens > opts.tokenLimit) break

    if (opts.start === 'top') output.push(line)
    else output.unshift(line)
  }

  return output
}

function newline(value: string | undefined) {
  if (!value) return ''
  return '\n' + value
}
