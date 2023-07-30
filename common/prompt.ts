import type { GenerateRequestV2 } from '../srv/adapter/type'
import type { AppSchema } from './types/schema'
import {
  AIAdapter,
  NOVEL_MODELS,
  OPENAI_CHAT_MODELS,
  OPENAI_MODELS,
  SUPPORTS_INSTRUCT,
} from './adapters'
import { formatCharacter } from './characters'
import { defaultTemplate } from './templates'
import { IMAGE_SUMMARY_PROMPT } from './image'
import { buildMemoryPrompt } from './memory'
import { defaultPresets, getFallbackPreset, isDefaultPreset } from './presets'
import { parseTemplate } from './template-parser'
import { Encoder } from './tokenize'
import { elapsedSince, getBotName, trimSentence } from './util'
import { Memory } from './types'

export const SAMPLE_CHAT_MARKER = `System: New conversation started. Previous conversations are examples only.`
export const SAMPLE_CHAT_PREAMBLE = `How {{char}} speaks:`

export type PromptParts = {
  scenario?: string
  greeting?: string
  sampleChat?: string[]
  persona: string
  allPersonas: string[]
  ujb?: string
  post: string[]
  memory?: string
  systemPrompt?: string

  /** User's impersonated personality */
  impersonality?: string

  chatEmbeds: string[]
  userEmbeds: string[]
}

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
  sender: AppSchema.Profile
  settings?: Partial<AppSchema.GenSettings>
  messages: AppSchema.ChatMessage[]
  retry?: AppSchema.ChatMessage
  continue?: string
  book?: AppSchema.MemoryBook
  replyAs: AppSchema.Character
  characters: GenerateRequestV2['characters']
  impersonate?: AppSchema.Character
  lastMessage: string
  trimSentences?: boolean
  chatEmbeds: Memory.UserEmbed<{ name: string }>[]
  userEmbeds: Memory.UserEmbed[]
}

export type BuildPromptOpts = {
  kind?: GenerateRequestV2['kind']
  chat: AppSchema.Chat
  char: AppSchema.Character
  replyAs: AppSchema.Character
  sender: AppSchema.Profile
  user: AppSchema.User
  continue?: string
  members: AppSchema.Profile[]
  settings?: Partial<AppSchema.GenSettings>
  impersonate?: AppSchema.Character
  chatEmbed?: Memory.UserEmbed<{ name: string }>[]
  userEmbed?: Memory.UserEmbed[]
}

/** {{user}}, <user>, {{char}}, <bot>, case insensitive */
export const BOT_REPLACE = /(\{\{char\}\}|<BOT>|\{\{name\}\})/gi
export const SELF_REPLACE = /(\{\{user\}\}|<USER>)/gi
export const START_REPLACE = /(<START>)/gi

const HOLDER_NAMES = {
  ujb: 'ujb',
  sampleChat: 'example_dialogue',
  persona: 'personality',
  allPersonas: 'all_personalities',
  memory: 'memory',
  post: 'post',
  scenario: 'scenario',
  history: 'history',
  systemPrompt: 'system_prompt',
  linebreak: 'br',
  chatAge: 'chat_age',
  idleDuration: 'idle_duration',
  impersonating: 'impersonating',
  chatEmbed: 'chat_embed',
  userEmbed: 'user_embed',
}

export const HOLDERS = {
  chatAge: /{{chat_age}}/gi,
  idleDuration: /{{idle_duration}}/gi,
  ujb: /{{ujb}}/gi,
  sampleChat: /{{example_dialogue}}/gi,
  scenario: /{{scenario}}/gi,
  memory: /{{memory}}/gi,
  persona: /{{personality}}/gi,
  allPersonas: /{{all_personalities}}/gi,
  post: /{{post}}/gi,
  history: /{{history}}/gi,
  systemPrompt: /{{system_prompt}}/gi,
  linebreak: /{{(br|linebreak|newline)}}/gi,
  impersonating: /{{impersonating}}/gi,
  chatEmbed: /{{chat_embed}}/gi,
  userEmbed: /{{user_embed}}/gi,
}

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
export function createPrompt(opts: PromptOpts, encoder: Encoder, maxContext?: number) {
  if (opts.trimSentences) {
    const nextMsgs = opts.messages.slice()
    for (let i = 0; i < nextMsgs.length; i++) {
      if (nextMsgs[i].userId) continue
      nextMsgs[i] = { ...nextMsgs[i], msg: trimSentence(nextMsgs[i].msg) }
    }

    opts.messages = nextMsgs

    if (opts.retry) {
      opts.retry = { ...opts.retry, msg: trimSentence(opts.retry.msg) }
    }
  }

  const sortedMsgs = opts.messages
    .filter((msg) => msg.adapter !== 'image')
    .slice()
    .sort(sortMessagesDesc)

  opts.messages = sortedMsgs

  /**
   * The lines from `getLinesForPrompt` are returned in time-descending order
   */
  const lines = getLinesForPrompt(opts, encoder, maxContext)
  const parts = getPromptParts(opts, lines, encoder)
  const template = getTemplate(opts, parts)

  const prompt = injectPlaceholders(template, {
    opts,
    parts,
    history: { lines, order: 'desc' },
    lastMessage: opts.lastMessage,
    characters: opts.characters,
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
  opts: GenerateRequestV2,
  parts: PromptParts,
  lines: string[],
  encoder: Encoder
) {
  const post = createPostPrompt(opts)
  const template = getTemplate(opts, parts)
  const history = { lines, order: 'asc' } as const
  const prompt = injectPlaceholders(template, {
    opts,
    parts,
    history,
    characters: opts.characters,
    lastMessage: opts.lastMessage,
    encoder,
  })
  return { lines: history.lines, prompt, parts, post }
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
    : opts.settings?.useTemplateParser
    ? opts.settings.gaslight ?? defaultTemplate
    : defaultTemplate
  return ensureValidTemplate(template, parts)
}

type InjectOpts = {
  opts: BuildPromptOpts
  parts: PromptParts
  lastMessage?: string
  characters: Record<string, AppSchema.Character>
  history?: { lines: string[]; order: 'asc' | 'desc' }
  encoder: Encoder
}

export function injectPlaceholders(template: string, inject: InjectOpts) {
  const { opts, parts, history: hist, encoder, ...rest } = inject
  const sender = opts.impersonate?.name || inject.opts.sender?.handle || 'You'

  // Automatically inject example conversation if not included in the prompt
  const sampleChat = parts.sampleChat?.join('\n')
  if (!template.match(HOLDERS.sampleChat) && sampleChat && hist) {
    const next = hist.lines.filter((line) => !line.includes(SAMPLE_CHAT_MARKER))

    const postSample =
      opts.settings?.service && SUPPORTS_INSTRUCT[opts.settings.service]
        ? SAMPLE_CHAT_MARKER
        : '<START>'

    const msg = `${SAMPLE_CHAT_PREAMBLE}\n${sampleChat}\n${postSample}`
      .replace(BOT_REPLACE, opts.replyAs.name)
      .replace(SELF_REPLACE, sender)
    if (hist.order === 'asc') next.unshift(msg)
    else next.push(msg)

    hist.lines = next
  }

  const { adapter, model } = getAdapter(opts.chat, opts.user, opts.settings)

  const lines = !hist
    ? []
    : hist.order === 'desc'
    ? hist.lines.slice()
    : hist.lines.slice().reverse()

  const result = parseTemplate(template, {
    ...opts,
    sender: inject.opts.sender,
    parts,
    lines,
    ...rest,
    limit: {
      context: getContextLimit(opts.settings, adapter, model),
      encoder,
    },
  })
  return result
}

function removeUnusedPlaceholders(template: string, parts: PromptParts) {
  const useUjb = !!parts.ujb
  const useSampleChat = !!parts.sampleChat?.join('\n')
  const useMemory = !!parts.memory
  const useScenario = !!parts.scenario
  const useSystemPrompt = !!parts.systemPrompt
  const useImpersonality = !!parts.impersonality
  const useChatEmbed = parts.chatEmbeds.join('').length > 0
  const useUserEmbed = parts.userEmbeds.join('').length > 0

  /**
   * Filter out lines that contain only one 'one of a kind' placeholder where the placeholder is empty
   * E.g. Remove the line: `Scenario: {{scenario}}` when the scenario is empty, but
   * Keep: `Scenario and Facts: {{scenario}} {{memory}}
   */
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
      if (!useImpersonality && line.match(HOLDERS.impersonating)) return false
      if (!useSystemPrompt && line.match(HOLDERS.systemPrompt)) return false
      if (!useChatEmbed && line.match(HOLDERS.chatEmbed)) return false
      if (!useUserEmbed && line.match(HOLDERS.userEmbed)) return false
      return true
    })
    .join('\n')

  return modified
}

export function ensureValidTemplate(
  template: string,
  parts: PromptParts,
  skip?: Array<'history' | 'post' | 'persona' | 'scenario' | 'userEmbed' | 'chatEmbed'>
) {
  const skips = new Set(skip || [])
  let hasScenario = !!template.match(HOLDERS.scenario)
  let hasPersona = !!template.match(HOLDERS.persona)
  let hasHistory = !!template.match(HOLDERS.history) || !!template.match(/{{\#each msg}}/gi)
  let hasPost = !!template.match(HOLDERS.post)
  let hasUjb = !!template.match(HOLDERS.ujb)
  let hasUserEmbed = !!template.match(HOLDERS.userEmbed)
  // let hasChatEmbed = !!template.match(HOLDERS.chatEmbed)

  const useScenario = !!parts.scenario
  const usePersona = !!parts.persona
  const useUserEmbed = parts.userEmbeds.length > 0
  // const useChatEmbed = parts.chatEmbeds.length > 0

  let modified = removeUnusedPlaceholders(template, parts)

  if (!skips.has('scenario') && !hasScenario && useScenario) {
    hasScenario = true
    modified += `\nScenario: {{${HOLDER_NAMES.scenario}}}`
  }

  if (!skips.has('persona') && !hasPersona && usePersona) {
    hasScenario = true
    modified += `\n{{char}}'s persona: {{${HOLDER_NAMES.persona}}}`
  }

  if (!skips.has('userEmbed') && !hasUserEmbed && useUserEmbed) {
    hasUserEmbed = true
    modified += `\nRelevant Information: {{${HOLDER_NAMES.userEmbed}}}`
  }

  if (!skips.has('post') && !skips.has('history') && !hasHistory && !hasPost) {
    modified += `\n{{history}}\n{{post}}`
  } else if (!skips.has('history') && !hasHistory && hasPost) {
    modified = modified.replace(HOLDERS.post, `{{${HOLDER_NAMES.history}}}\n{{post}}`)
  } else if (!skips.has('post') && hasHistory && !hasPost) {
    modified += `\n{{post}}`
  }

  const post = !hasUjb && parts.ujb ? `{{ujb}}\n{{post}}` : `{{post}}`
  modified = modified.replace(HOLDERS.post, post)

  return modified
}

type PromptPartsOptions = Pick<
  PromptOpts,
  | 'kind'
  | 'chat'
  | 'char'
  | 'sender'
  | 'members'
  | 'continue'
  | 'settings'
  | 'user'
  | 'book'
  | 'replyAs'
  | 'impersonate'
  | 'characters'
  | 'chatEmbeds'
  | 'userEmbeds'
>

export function getPromptParts(opts: PromptPartsOptions, lines: string[], encoder: Encoder) {
  const { chat, char, replyAs } = opts
  const sender = opts.impersonate ? opts.impersonate.name : opts.sender?.handle || 'You'

  const replace = (value: string) => placeholderReplace(value, opts.replyAs.name, sender)

  const parts: PromptParts = {
    persona: formatCharacter(
      replyAs.name,
      replyAs._id === char._id ? chat.overrides ?? replyAs.persona : replyAs.persona
    ),
    post: [],
    allPersonas: [],
    chatEmbeds: [],
    userEmbeds: [],
  }

  const personalities = new Set([replyAs._id])

  if (opts.impersonate) {
    parts.impersonality = formatCharacter(
      opts.impersonate.name,
      opts.impersonate.persona,
      opts.impersonate.persona.kind
    )
  }

  for (const bot of Object.values(opts.characters || {})) {
    if (!bot) continue
    if (personalities.has(bot._id)) continue
    personalities.add(bot._id)
    parts.allPersonas.push(
      `${bot.name}'s personality: ${formatCharacter(bot.name, bot.persona, bot.persona.kind)}`
    )
  }

  if (chat.scenario && chat.overrides) {
    // we use the BOT_REPLACE here otherwise later it'll get replaced with the
    // replyAs instead of the main character
    // (we always use the main character's scenario, not replyAs)
    parts.scenario = chat.scenario.replace(BOT_REPLACE, char.name)
  } else {
    parts.scenario = char.scenario.replace(BOT_REPLACE, char.name)
  }

  parts.sampleChat = (
    replyAs._id === char._id && !!chat.overrides
      ? chat.sampleChat ?? replyAs.sampleChat
      : replyAs.sampleChat
  )
    .split('\n')
    .filter(removeEmpty)
    // This will use the 'replyAs' character "if present", otherwise it'll defer to the chat.character.name
    .map(replace)

  if (chat.greeting) {
    parts.greeting = replace(chat.greeting)
  } else {
    parts.greeting = replace(char.greeting)
  }

  const post = createPostPrompt(opts)

  if (opts.continue) {
    post.unshift(`${char.name}: ${opts.continue}`)
  }

  const linesForMemory = [...lines].reverse()
  const books: AppSchema.MemoryBook[] = []
  if (char.characterBook) books.push(char.characterBook)
  if (opts.book) books.push(opts.book)

  const memory = buildMemoryPrompt({ ...opts, books, lines: linesForMemory }, encoder)
  parts.memory = memory?.prompt

  const supplementary = getSupplementaryParts(opts, replyAs)
  parts.ujb = supplementary.ujb
  parts.systemPrompt = supplementary.system

  parts.post = post.map(replace)

  if (opts.userEmbeds) {
    const embeds = opts.userEmbeds.map((line) => line.text)
    const fit = fillPromptWithLines(encoder, opts.settings?.memoryUserEmbedLimit || 500, '', embeds)
    parts.userEmbeds = fit
  }

  if (opts.chatEmbeds) {
    const embeds = opts.chatEmbeds.map((line) => `${line.name}: ${line.text}`)
    const fit = fillPromptWithLines(encoder, opts.settings?.memoryChatEmbedLimit || 500, '', embeds)
    parts.chatEmbeds = fit
  }

  return parts
}

function getSupplementaryParts(opts: PromptPartsOptions, replyAs: AppSchema.Character) {
  const { settings, user } = opts
  const parts = {
    ujb: '' as string | undefined,
    system: '' as string | undefined,
  }

  if (!settings?.service) return parts
  const supports = SUPPORTS_INSTRUCT[settings?.service]
  if (!supports?.(user)) return parts

  parts.ujb = settings.ultimeJailbreak
  parts.system = settings.systemPrompt

  if (replyAs.postHistoryInstructions && !settings.ignoreCharacterUjb) {
    parts.ujb = replyAs.postHistoryInstructions
  }

  if (replyAs.systemPrompt && !settings.ignoreCharacterSystemPrompt) {
    parts.system = replyAs.systemPrompt
  }

  parts.ujb = parts.ujb?.replace(/{{original}}/gi, settings.ultimeJailbreak || '')
  parts.system = parts.system?.replace(/{{original}}/gi, settings.systemPrompt || '')

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
    let text =
      opts.user.images?.summaryPrompt || opts.settings?.service === 'novel'
        ? IMAGE_SUMMARY_PROMPT.novel
        : IMAGE_SUMMARY_PROMPT.other

    if (opts.settings?.service !== 'novel') {
      if (!text.startsWith('(')) text = '(' + text
      if (!text.endsWith(')')) text += ')'
    }

    post.push(`System: ${text}\nSummary:`)
  } else {
    post.push(`${opts.replyAs.name}:`)
  }
  return post
}

function placeholderReplace(value: string, charName: string, senderName: string) {
  return value.replace(BOT_REPLACE, charName).replace(SELF_REPLACE, senderName)
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
  { settings, char, members, messages, continue: cont, book, ...opts }: PromptOpts,
  encoder: Encoder,
  maxContext?: number
) {
  const { adapter, model } = getAdapter(opts.chat, opts.user, settings)
  maxContext = maxContext || getContextLimit(settings, adapter, model)

  const profiles = new Map<string, AppSchema.Profile>()
  for (const member of members) {
    profiles.set(member.userId, member)
  }

  const formatMsg = (msg: AppSchema.ChatMessage) => {
    const sender = opts.impersonate
      ? opts.impersonate.name
      : profiles.get(msg.userId || opts.chat.userId)?.handle || 'You'

    const botName = getBotName(opts.chat, msg, opts.characters, opts.replyAs, char)

    return fillPlaceholders(msg, botName, sender).trim()
  }

  const history = messages.slice().sort(sortMessagesDesc).map(formatMsg)

  const lines = fillPromptWithLines(encoder, maxContext, '', history)

  if (opts.trimSentences) {
    return lines.map(trimSentence)
  }

  return lines
}

export function fillPromptWithLines(
  encoder: Encoder,
  tokenLimit: number,
  amble: string,
  lines: string[]
) {
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

function fillPlaceholders(chatMsg: AppSchema.ChatMessage, char: string, user: string): string {
  const prefix = chatMsg.system ? 'System' : chatMsg.characterId ? char : user
  const msg = chatMsg.msg.replace(BOT_REPLACE, char).replace(SELF_REPLACE, user)

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
): Partial<AppSchema.UserGenPreset> {
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
    if (isDefaultPreset(chat.genPreset))
      return { _id: chat.genPreset, ...defaultPresets[chat.genPreset] }

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
    if (isDefaultPreset(defaultId)) return { _id: defaultId, ...defaultPresets[defaultId] }
    const preset = userPresets.find((preset) => preset._id === defaultId)
    if (preset) return preset
  }

  // #4
  const { adapter, isThirdParty } = getAdapter(chat, user, undefined)
  const fallbackId = user.defaultPresets?.[isThirdParty ? 'kobold' : adapter]

  if (fallbackId) {
    if (isDefaultPreset(fallbackId)) return { _id: fallbackId, ...defaultPresets[fallbackId] }
    const preset = userPresets.find((preset) => preset._id === fallbackId)
    if (preset) return preset
  }

  // #5
  return getFallbackPreset(adapter || 'horde')
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
  preset: Partial<AppSchema.GenSettings> | undefined
) {
  const chatAdapter =
    !chat.adapter || chat.adapter === 'default' ? config.defaultAdapter : chat.adapter

  let adapter = preset?.service ? preset.service : chatAdapter

  const thirdPartyFormat = preset?.thirdPartyFormat || config.thirdPartyFormat
  const isThirdParty = THIRD_PARTY_ADAPTERS[thirdPartyFormat] && adapter === 'kobold'

  if (adapter === 'kobold' && THIRD_PARTY_ADAPTERS[config.thirdPartyFormat]) {
    adapter = config.thirdPartyFormat
  }

  let model = ''
  let presetName = 'Fallback Preset'

  if (adapter === 'replicate') {
    model = preset?.replicateModelType || 'llama'
  }

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

export function getContextLimit(
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
    case 'horde':
    case 'ooba':
      return configuredMax - genAmount

    case 'novel': {
      if (model === NOVEL_MODELS.clio_v1) return 8000 - genAmount
      return configuredMax - genAmount
    }

    case 'openai': {
      const models = new Set<string>([
        OPENAI_MODELS.Turbo,
        OPENAI_MODELS.Turbo0301,
        OPENAI_MODELS.Turbo0613,
        OPENAI_MODELS.DaVinci,
      ])

      if (!model || models.has(model)) return Math.min(configuredMax, 4090) - genAmount
      if (model === OPENAI_MODELS.Turbo_16k) return Math.min(configuredMax, 16360) - genAmount

      return configuredMax - genAmount
    }

    case 'replicate':
      return configuredMax - genAmount

    case 'scale':
      return configuredMax - genAmount

    case 'claude':
      return configuredMax - genAmount

    case 'goose':
      return Math.min(configuredMax, 2048) - genAmount

    case 'openrouter':
      if (gen?.openRouterModel) {
        return Math.min(gen.openRouterModel.context_length, configuredMax) - genAmount
      }

      return Math.min(configuredMax, 4096) - genAmount
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

export function parseTemplateV1(
  template: string,
  { opts, parts, history: hist, encoder, ...rest }: InjectOpts
) {
  const profile = opts.members.find((mem) => mem.userId === opts.chat.userId)
  const sender = opts.impersonate?.name || profile?.handle || 'You'

  // Automatically inject example conversation if not included in the prompt
  const sampleChat = parts.sampleChat?.join('\n')
  if (!template.match(HOLDERS.sampleChat) && sampleChat && hist) {
    const next = hist.lines.filter((line) => !line.includes(SAMPLE_CHAT_MARKER))

    const postSample =
      opts.settings?.service && SUPPORTS_INSTRUCT[opts.settings.service]
        ? SAMPLE_CHAT_MARKER
        : '<START>'

    const msg = `${SAMPLE_CHAT_PREAMBLE}\n${sampleChat}\n${postSample}`
      .replace(BOT_REPLACE, opts.replyAs.name)
      .replace(SELF_REPLACE, sender)
    if (hist.order === 'asc') next.unshift(msg)
    else next.push(msg)

    hist.lines = next
  }

  let prompt = template
    // UJB must be first to replace placeholders within the UJB
    // Note: for character post-history-instructions, this is off-spec behavior
    .replace(HOLDERS.ujb, parts.ujb || '')
    .replace(HOLDERS.sampleChat, newline(sampleChat))
    .replace(HOLDERS.scenario, parts.scenario || '')
    .replace(HOLDERS.memory, newline(parts.memory))
    .replace(HOLDERS.persona, parts.persona)
    .replace(HOLDERS.impersonating, parts.impersonality || '')
    .replace(HOLDERS.allPersonas, parts.allPersonas?.join('\n') || '')
    .replace(HOLDERS.post, parts.post.join('\n'))
    .replace(HOLDERS.linebreak, '\n')
    .replace(HOLDERS.chatAge, elapsedSince(opts.chat.createdAt))
    .replace(HOLDERS.idleDuration, elapsedSince(rest.lastMessage || ''))
    .replace(HOLDERS.chatEmbed, parts.chatEmbeds.join('\n') || '')
    .replace(HOLDERS.userEmbed, parts.userEmbeds.join('\n') || '')
    // system prompt should not support other placeholders
    .replace(HOLDERS.systemPrompt, newline(parts.systemPrompt))
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

function newline(value: string | undefined) {
  if (!value) return ''
  return '\n' + value
}
