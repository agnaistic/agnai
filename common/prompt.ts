import type { GenerateRequestV2 } from '../srv/adapter/type'
import type { AppSchema, TokenCounter } from './types'
import {
  AIAdapter,
  GOOGLE_LIMITS,
  NOVEL_MODELS,
  OPENAI_CONTEXTS,
  THIRDPARTY_HANDLERS,
} from './adapters'
import { formatCharacter } from './characters'
import { defaultTemplate } from './mode-templates'
import { buildMemoryPrompt } from './memory'
import { defaultPresets, getFallbackPreset, isDefaultPreset } from './presets'
import { parseTemplate } from './template-parser'
import { getMessageAuthor, getBotName, trimSentence, neat } from './util'
import { Memory } from './types'
import { promptOrderToTemplate, SIMPLE_ORDER } from './prompt-order'
import { ModelFormat, replaceTags } from './presets/templates'

export type TickHandler<T = any> = (response: string, state: InferenceState, json?: T) => void

export type InferenceState = 'partial' | 'done' | 'error' | 'warning'

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
  template: {
    parsed: string
    inserts: Map<number, string>
    linesAddedCount: number
  }
  lines: string[]
  parts: PromptParts
  shown: boolean
}

export type PromptConfig = {
  adapter: AIAdapter
  model: string
  encoder: TokenCounter
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
  resolvedScenario: string
  modelFormat?: ModelFormat
  jsonValues: Record<string, any> | undefined
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
export const BOT_REPLACE = /(\{\{char\}\}|\{\{name\}\})/gi
export const SELF_REPLACE = /(\{\{user\}\})/gi
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

const defaultFieldPrompt = neat`
{{prop}}:
{{value}}
`
export function buildModPrompt(opts: {
  prompt: string
  fields: string
  char: Partial<AppSchema.Character>
}) {
  const aliases: { [key in keyof AppSchema.Character]?: string } = {
    sampleChat: 'Example Dialogue',
    postHistoryInstructions: 'Character Jailbreak',
    systemPrompt: 'Character Instructions',
  }

  const props: Array<keyof AppSchema.Character> = [
    'name',
    'description',
    'appearance',
    'scenario',
    'greeting',
    'sampleChat',
    'systemPrompt',
    'postHistoryInstructions',
  ]

  const inject = (prop: string, value: string) =>
    (opts.fields || defaultFieldPrompt)
      .replace(/{{prop}}/gi, prop)
      .replace(/{{value}}/gi, value)
      .replace(/\n\n+/g, '\n')

  const fields = props
    .filter((f) => {
      const value = opts.char[f]
      if (typeof value !== 'string') return false
      return !!value.trim()
    })
    .map((f) => {
      const value = opts.char[f]
      if (typeof value !== 'string') return ''

      const prop = titlize(aliases[f] || f)
      return inject(prop, value)
    })

  for (const [attr, values] of Object.entries(opts.char.persona?.attributes || {})) {
    const value = values.join(', ')
    if (!value.trim()) continue

    fields.push(inject(`Attribute '${titlize(attr)}'`, value))
  }

  return opts.prompt.replace(/{{fields}}/gi, fields.join('\n\n'))
}

function titlize(str: string) {
  return `${str[0].toUpperCase()}${str.slice(1).toLowerCase()}`
}

/**
 * This is only ever invoked client-side
 * @param opts
 * @returns
 */
export async function createPromptParts(opts: PromptOpts, encoder: TokenCounter) {
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
  let template = getTemplate(opts)
  const templateSize = await encoder(template)

  if (opts.modelFormat) {
    template = replaceTags(template, opts.modelFormat)
  }

  /**
   * It's important for us to pass in a max context that is _realistic-ish_ as the embeddings
   * are retrieved based on the number of history messages we return here.
   *
   * If we ambitiously include the entire history then embeddings will never be included.
   * The queryable embeddings are messages that are _NOT_ included in the context
   */
  const maxContext = opts.settings
    ? getContextLimit(opts.user, opts.settings) - templateSize - opts.settings.maxTokens!
    : undefined
  const lines = await getLinesForPrompt(opts, encoder, maxContext)
  const parts = await buildPromptParts(opts, lines, encoder)

  const prompt = await injectPlaceholders(template, {
    opts,
    parts,
    history: { lines, order: 'desc' },
    lastMessage: opts.lastMessage,
    characters: opts.characters,
    encoder,
    jsonValues: opts.jsonValues,
  })

  return { lines: lines.reverse(), parts, template: prompt }
}

export type AssembledPrompt = Awaited<ReturnType<typeof assemblePrompt>>

/**
 * This is only ever invoked server-side
 *
 * @param opts
 * @param parts
 * @param lines Always in time-ascending order (oldest to newest)
 * @returns
 */
export async function assemblePrompt(
  opts: GenerateRequestV2,
  parts: PromptParts,
  lines: string[],
  encoder: TokenCounter
) {
  const post = createPostPrompt(opts)
  const template = getTemplate(opts)

  const history = { lines, order: 'asc' } as const
  let { parsed, inserts, length, sections, linesAddedCount } = await injectPlaceholders(template, {
    opts,
    parts,
    history,
    characters: opts.characters,
    lastMessage: opts.lastMessage,
    encoder,
    jsonValues: opts.jsonValues,
  })

  return {
    lines: history.lines,
    prompt: parsed,
    inserts,
    parts,
    post,
    length,
    sections,
    linesAddedCount,
  }
}

export function getTemplate(opts: Pick<GenerateRequestV2, 'settings' | 'chat'>) {
  const fallback = getFallbackPreset(opts.settings?.service!)
  if (opts.settings?.useAdvancedPrompt === 'basic' || opts.settings?.presetMode === 'simple') {
    if (opts.settings.presetMode === 'simple') {
      const template = promptOrderToTemplate('Universal', SIMPLE_ORDER)
      return template
    }

    if (opts.settings.modelFormat && opts.settings.promptOrder) {
      const template = promptOrderToTemplate(opts.settings.modelFormat, opts.settings.promptOrder)
      return template
    }
  }

  const template = opts.settings?.gaslight || fallback?.gaslight || defaultTemplate

  if (opts.settings?.useAdvancedPrompt === 'no-validation') {
    return template
  }

  // Deprecated
  return ensureValidTemplate(template)
}

type InjectOpts = {
  opts: BuildPromptOpts
  parts: PromptParts
  lastMessage?: string
  characters: Record<string, AppSchema.Character>
  jsonValues: Record<string, any> | undefined
  history?: { lines: string[]; order: 'asc' | 'desc' }
  encoder: TokenCounter
}

export async function injectPlaceholders(template: string, inject: InjectOpts) {
  const { opts, parts, history: hist, encoder, ...rest } = inject

  template = replaceTags(template, opts.settings?.modelFormat || 'Alpaca')

  // Basic templates can exclude example dialogue
  const validate =
    opts.settings?.useAdvancedPrompt !== 'no-validation' &&
    opts.settings?.useAdvancedPrompt !== 'basic'

  // Automatically inject example conversation if not included in the prompt
  /** @todo assess whether or not this should be here -- it ignores 'unvalidated' prompt rules */
  const sender = opts.impersonate?.name || inject.opts.sender?.handle || 'You'
  const sampleChat = parts.sampleChat?.join('\n')
  if (!template.match(HOLDERS.sampleChat) && sampleChat && hist && validate) {
    const next = hist.lines.filter((line) => !line.includes(SAMPLE_CHAT_MARKER))

    const svc = opts.settings?.service
    const postSample =
      svc === 'openai' || svc === 'openrouter' || svc === 'scale' ? SAMPLE_CHAT_MARKER : '<START>'

    const msg = `${SAMPLE_CHAT_PREAMBLE}\n${sampleChat}\n${postSample}`
      .replace(BOT_REPLACE, opts.replyAs.name)
      .replace(SELF_REPLACE, sender)
    if (hist.order === 'asc') next.unshift(msg)
    else next.push(msg)

    hist.lines = next
  }

  const lines = !hist
    ? []
    : hist.order === 'desc'
    ? hist.lines.slice()
    : hist.lines.slice().reverse()

  const result = await parseTemplate(template, {
    ...opts,
    continue: opts.kind === 'continue',
    sender: inject.opts.sender,
    parts,
    lines,
    ...rest,
    limit: {
      context: getContextLimit(opts.user, opts.settings),
      encoder,
    },
  })
  return result
}

/**
 * Add conversation history and post-amble if they are missing from the template
 */
export function ensureValidTemplate(
  template: string,
  skip?: Array<'history' | 'post' | 'persona' | 'scenario' | 'userEmbed' | 'chatEmbed'>
) {
  const skips = new Set(skip || [])

  let hasHistory = !!template.match(HOLDERS.history) || !!template.match(/{{\#each msg}}/gi)
  let hasPost = !!template.match(HOLDERS.post)

  let modified = template

  if (!skips.has('post') && !skips.has('history') && !hasHistory && !hasPost) {
    modified += `\n{{history}}\n{{post}}`
  } else if (!skips.has('history') && !hasHistory && hasPost) {
    modified = modified.replace(HOLDERS.post, `{{${HOLDER_NAMES.history}}}\n{{post}}`)
  } else if (!skips.has('post') && hasHistory && !hasPost) {
    modified += `\n{{post}}`
  }

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
  | 'resolvedScenario'
>

export async function buildPromptParts(
  opts: PromptPartsOptions,
  lines: string[],
  encoder: TokenCounter
) {
  const { chat, char, replyAs } = opts
  const sender = opts.impersonate ? opts.impersonate.name : opts.sender?.handle || 'You'

  const replace = (value: string) => placeholderReplace(value, opts.replyAs.name, sender)

  const parts: PromptParts = {
    systemPrompt: opts.settings?.systemPrompt || '',
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

  if (opts.impersonate?.persona) {
    parts.impersonality = formatCharacter(
      opts.impersonate.name,
      opts.impersonate.persona,
      opts.impersonate.persona.kind
    )
  }

  for (const bot of Object.values(opts.characters || {})) {
    if (!bot) continue
    if (personalities.has(bot._id)) continue

    const temp = opts.chat.tempCharacters?.[bot._id]
    if (temp?.deletedAt || temp?.favorite === false) continue

    if (!bot._id.startsWith('temp-') && !chat.characters?.[bot._id]) {
      continue
    }

    personalities.add(bot._id)
    parts.allPersonas.push(
      `${bot.name}'s personality: ${formatCharacter(bot.name, bot.persona, bot.persona.kind)}`
    )
  }

  // we use the BOT_REPLACE here otherwise later it'll get replaced with the
  // replyAs instead of the main character
  // (we always use the main character's scenario, not replyAs)
  parts.scenario = opts.resolvedScenario.replace(BOT_REPLACE, char.name)

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
  if (replyAs.characterBook) books.push(replyAs.characterBook)
  if (opts.book) books.push(opts.book)

  parts.memory = await buildMemoryPrompt({ ...opts, books, lines: linesForMemory }, encoder)

  const supplementary = getSupplementaryParts(opts, replyAs)
  parts.ujb = supplementary.ujb
  parts.systemPrompt = supplementary.system

  parts.post = post.map(replace)

  if (opts.userEmbeds) {
    const embeds = opts.userEmbeds.map((line) => line.text)
    const { adding: fit } = await fillPromptWithLines({
      encoder,
      tokenLimit: opts.settings?.memoryUserEmbedLimit || 500,
      context: '',
      lines: embeds,
    })
    parts.userEmbeds = fit
  }

  if (opts.chatEmbeds) {
    const embeds = opts.chatEmbeds.map((line) => `${line.name}: ${line.text}`)
    const { adding: fit } = await fillPromptWithLines({
      encoder,
      tokenLimit: opts.settings?.memoryChatEmbedLimit || 500,
      context: '',
      lines: embeds,
    })
    parts.chatEmbeds = fit
  }

  return parts
}

function getSupplementaryParts(opts: PromptPartsOptions, replyAs: AppSchema.Character) {
  const { settings, chat } = opts
  const parts = {
    ujb: '' as string | undefined,
    system: '' as string | undefined,
  }

  if (!settings?.service) return parts

  parts.ujb = settings.ultimeJailbreak
  parts.system = settings.systemPrompt

  if (replyAs.postHistoryInstructions && !settings.ignoreCharacterUjb) {
    parts.ujb = replyAs.postHistoryInstructions
  }

  if (replyAs.systemPrompt && !settings.ignoreCharacterSystemPrompt) {
    parts.system = replyAs.systemPrompt
  }

  if (chat.overrides && opts.char._id === opts.replyAs._id) {
    if (chat.systemPrompt) parts.system = chat.systemPrompt
    if (chat.postHistoryInstructions) parts.ujb = chat.postHistoryInstructions
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

  if (opts.kind === 'chat-query') {
    post.push(`Query Response:`)
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
export async function getLinesForPrompt(
  { settings, members, messages, continue: cont, book, ...opts }: PromptOpts,
  encoder: TokenCounter,
  maxContext?: number
) {
  maxContext = maxContext || getContextLimit(opts.user, settings)

  const profiles = new Map<string, AppSchema.Profile>()
  for (const member of members) {
    profiles.set(member.userId, member)
  }

  const formatMsg = (msg: AppSchema.ChatMessage, i: number, all: AppSchema.ChatMessage[]) => {
    const profile = msg.userId ? profiles.get(msg.userId) : opts.sender
    const sender = opts.impersonate
      ? opts.impersonate.name
      : profiles.get(msg.userId || opts.chat.userId)?.handle || 'You'

    const author = getMessageAuthor({
      chat: opts.chat,
      msg,
      chars: opts.characters,
      members: profiles,
      sender: opts.sender,
      impersonate: opts.impersonate,
    })
    const char = getBotName(
      opts.chat,
      msg,
      opts.characters,
      opts.replyAs,
      opts.char,
      profile || opts.sender,
      opts.impersonate
    )

    return fillPlaceholders({ msg, author, char, user: sender }).trim()
  }

  const history = messages.slice().sort(sortMessagesDesc).map(formatMsg)

  const { adding: lines } = await fillPromptWithLines({
    encoder,
    tokenLimit: maxContext,
    context: '',
    lines: history,
  })

  if (opts.trimSentences) {
    return lines.map(trimSentence)
  }

  return lines
}

/** This function is not used for Claude or Chat */
export function formatInsert(insert: string): string {
  return `${insert}\n`
}

/**
 * This function contains the inserts logic for all non-chat, non-Claude prompts
 * In other words, it should work:
 * - with #each msg
 * - with all non-chat models regardless of whether you use #each msg or not
 * This logic also exists in other places:
 * - srv/adapter/chat-completion.ts toChatCompletionPayload
 * - srv/adapter/claude.ts createClaudePrompt
 */
export async function fillPromptWithLines(opts: {
  encoder: TokenCounter
  tokenLimit: number
  context: string
  lines: string[]

  /** Nodes to be inserted at a particular depth in the `lines` */
  inserts?: Map<number, string>
  optional?: Array<{ id: string; content: string }>
}) {
  const { encoder, tokenLimit, context, lines, inserts = new Map(), optional = [] } = opts
  const insertsCost = await encoder(Array.from(inserts.values()).join(' '))
  const tokenLimitMinusInserts = tokenLimit - insertsCost

  /**
   * Optional placeholders do not count towards token counts.
   * They are optional after everything else has been inserted therefore we remove them from the prompt
   */
  const cleanContext = optional.reduce((amble, { id }) => amble.replace(id, ''), context)
  let count = await encoder(cleanContext)
  const adding: string[] = []

  let linesAddedCount = 0
  for (const line of lines) {
    const tokens = await encoder(line)
    if (tokens + count > tokenLimitMinusInserts) {
      break
    }
    const insert = inserts.get(linesAddedCount)
    if (insert) adding.push(formatInsert(insert))

    count += tokens
    adding.push(line)
    linesAddedCount++
  }

  // We don't omit inserts with depth > message count in context size
  // instead we put them at the top of the conversation history
  const remainingInserts = insertsDeeperThanConvoHistory(inserts, linesAddedCount)
  if (remainingInserts) {
    adding.push(formatInsert(remainingInserts))
  }

  const unusedTokens = tokenLimitMinusInserts - count
  return { adding, unusedTokens, linesAddedCount }
}

export function insertsDeeperThanConvoHistory(
  inserts: Map<number, string>,
  nonInsertLines: number
) {
  return [...inserts.entries()]
    .filter(([depth, _]) => depth >= nonInsertLines)
    .map(([_, prompt]) => prompt)
    .join('\n')
}

function fillPlaceholders(opts: {
  msg: AppSchema.ChatMessage
  author: string
  char: string
  user: string
}): string {
  const prefix = opts.msg.system ? 'System' : opts.author
  const text = opts.msg.json?.history || opts.msg.msg
  const msg = text.replace(BOT_REPLACE, opts.char).replace(SELF_REPLACE, opts.user)

  return `${prefix}: ${msg}`
}

function sortMessagesDesc(l: AppSchema.ChatMessage, r: AppSchema.ChatMessage) {
  return l.createdAt > r.createdAt ? -1 : l.createdAt === r.createdAt ? 0 : 1
}

export function getChatPreset(
  chat: AppSchema.Chat,
  user: AppSchema.User,
  userPresets: AppSchema.UserGenPreset[]
): Partial<AppSchema.UserGenPreset> {
  /**
   * Order of precedence:
   * 1. chat.genPreset
   * 2. chat.genSettings (Deprecated)
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
  user: AppSchema.User,
  preset: Partial<AppSchema.GenSettings> | undefined
) {
  let adapter = preset?.service!

  const thirdPartyFormat = preset?.thirdPartyFormat || user.thirdPartyFormat
  const isThirdParty = thirdPartyFormat in THIRDPARTY_HANDLERS && adapter === 'kobold'

  if (adapter === 'kobold') {
    adapter = THIRDPARTY_HANDLERS[user.thirdPartyFormat]
  }

  let model = ''
  let presetName = 'Fallback Preset'

  if (adapter === 'replicate') {
    model = preset?.replicateModelType || 'llama'
  }

  if (adapter === 'novel') {
    model = user.novelModel
  }

  if (adapter === 'openai') {
    model = preset?.thirdPartyModel || preset?.oaiModel || defaultPresets.openai.oaiModel
  }

  if (chat.genPreset) {
    if (isDefaultPreset(chat.genPreset)) {
      presetName = 'Built-in Preset'
    } else presetName = 'User Preset'
  } else if (chat.genSettings) {
    presetName = 'Chat Settings'
  } else if (user.defaultPresets) {
    const servicePreset = user.defaultPresets[adapter]
    if (servicePreset) {
      presetName = `Service Preset`
    }
  }

  const contextLimit = getContextLimit(user, preset)

  return { adapter, model, preset: presetName, contextLimit, isThirdParty }
}

type LimitStrategy = (
  user: AppSchema.User,
  gen: Partial<AppSchema.GenSettings> | undefined
) => { context: number; tokens: number } | void

let _strategy: LimitStrategy = () => {}
export function setContextLimitStrategy(strategy: LimitStrategy) {
  _strategy = strategy
}

/**
 * When we know the maximum context limit for a particular LLM, ensure that the context limit we use does not exceed it.
 */

export function getContextLimit(
  user: AppSchema.User,
  gen: Partial<AppSchema.GenSettings> | undefined
): number {
  const genAmount = gen?.maxTokens || getFallbackPreset(gen?.service || 'horde')?.maxTokens || 80
  const configuredMax =
    gen?.maxContextLength || getFallbackPreset(gen?.service || 'horde')?.maxContextLength || 4096

  if (!gen?.service) return configuredMax - genAmount

  switch (gen.service) {
    case 'agnaistic': {
      const stratMax = _strategy(user, gen)
      if (gen?.useMaxContext && stratMax) {
        return stratMax.context - genAmount
      }

      const max = Math.min(configuredMax, stratMax?.context ?? configuredMax)
      return max - genAmount
    }

    // Any LLM could be used here so don't max any assumptions
    case 'ooba':
    case 'petals':
    case 'horde':
      return configuredMax - genAmount

    case 'kobold': {
      if (!gen.useMaxContext) return configuredMax - genAmount
      switch (gen.thirdPartyFormat) {
        case 'gemini': {
          const max = GOOGLE_LIMITS[gen.googleModel!]
          return max ? max - genAmount : configuredMax - genAmount
        }

        default:
          return configuredMax - genAmount
      }
    }

    case 'novel': {
      const model = gen?.novelModel || NOVEL_MODELS.kayra_v1
      if (model === NOVEL_MODELS.clio_v1 || model === NOVEL_MODELS.kayra_v1) {
        return Math.min(8000, configuredMax) - genAmount
      }

      return configuredMax - genAmount
    }

    case 'openai': {
      const model = (gen?.service === 'openai' ? gen?.oaiModel! : gen?.thirdPartyModel) || ''
      const limit = OPENAI_CONTEXTS[model] || 128000
      return Math.min(configuredMax, limit) - genAmount
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
        if (gen.useMaxContext) return gen.openRouterModel.context_length - genAmount

        return Math.min(gen.openRouterModel.context_length, configuredMax) - genAmount
      }

      return Math.min(configuredMax, 4096) - genAmount

    case 'mancer':
      return Math.min(configuredMax, 8000) - genAmount

    case 'venus':
      return Math.min(configuredMax, 7800) - genAmount
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
  encoder: TokenCounter
  tokenLimit: number
}

/**
 * Remove lines from a body of text that contains line breaks
 */
export async function trimTokens(opts: TrimOpts) {
  const text = Array.isArray(opts.input) ? opts.input.slice() : opts.input.split('\n')
  if (opts.start === 'bottom') text.reverse()

  let tokens = 0
  let output: string[] = []

  for (const line of text) {
    tokens += await opts.encoder(line)
    if (tokens > opts.tokenLimit) break

    if (opts.start === 'top') output.push(line)
    else output.unshift(line)
  }

  return output
}

/**
 * Resolve scenario for the chat based on chat, main character and scenario settings.
 */
export function resolveScenario(
  chat: AppSchema.Chat,
  mainChar: AppSchema.Character,
  books: AppSchema.ScenarioBook[]
) {
  if (chat.overrides) return chat.scenario || ''

  let result = mainChar.scenario

  for (const book of books) {
    if (book.overwriteCharacterScenario) {
      result = book.text || ''
      break
    }
  }

  for (const book of books) {
    if (!book.overwriteCharacterScenario) {
      result += `\n${book.text}`
    }
  }

  return result.trim()
}

export type JsonType = { title?: string; description?: string; valid?: string } & (
  | { type: 'string'; maxLength?: number }
  | { type: 'integer' }
  | { type: 'enum'; enum: string[] }
  | { type: 'bool' }
)

export type JsonSchema = {
  title: string
  type: 'object'
  properties: Record<string, JsonType>
  required: string[]
}

export interface JsonField {
  name: string
  disabled: boolean
  type: JsonType
}

export const schema = {
  str: (o?: { desc?: string; title?: string; maxLength?: number }) => ({
    type: 'string',
    title: o?.title,
    maxLength: o?.maxLength ? +o.maxLength : undefined,
  }),
  int: (o?: { title?: string; desc?: string }) => ({
    type: 'integer',
    title: o?.title,
    description: o?.desc,
  }),
  enum: (o: { values: string[]; title?: string; desc?: string }) => ({
    type: 'enum',
    enum: o.values,
    title: o.title,
    description: o.desc,
  }),
  bool: (o?: { title?: string; desc?: string }) => ({
    type: 'bool',
    enum: ['true', 'false', 'yes', 'no'],
    title: o?.title,
    description: o?.desc,
  }),
} satisfies Record<string, (...args: any[]) => JsonType>

export function toJsonSchema(body: JsonField[]): JsonSchema | undefined {
  if (!Array.isArray(body) || !body.length) return
  if (body.every((field) => field.disabled)) return

  const sch: JsonSchema = {
    title: 'Response',
    type: 'object',
    properties: {},
    required: [],
  }

  const props: JsonSchema['properties'] = {}

  if (!!body && !Array.isArray(body)) {
    body = Object.entries(body).map(([key, value]) => ({
      name: key,
      disabled: false,
      type: value,
    })) as any
  }

  let added = 0
  for (const { name, disabled, type } of body) {
    if (disabled) continue

    added++
    props[name] = { ...type }
    switch (type.type) {
      case 'string': {
        props[name] = schema.str(type)
        break
      }

      case 'bool': {
        props[name] = schema.bool(type)
        props[name].type = 'enum' as any
        break
      }

      case 'enum': {
        props[name] = {
          type: 'enum',
          enum: type.enum,
        }
        break
      }

      case 'integer': {
        props[name] = schema.int(type)
        break
      }
    }

    delete props[name].valid

    if (type.type === 'bool') {
      props[name].type = 'enum'

      // @ts-ignore
      props[name].enum = ['true', 'false', 'yes', 'no']
    }
    sch.required.push(name)
  }

  sch.properties = props

  if (added === 0) return
  return sch
}

export function fromJsonResponse(schema: JsonField[], response: any, output: any = {}): any {
  const json: Record<string, any> = tryJsonParseResponse(response)

  for (let [key, value] of Object.entries(json)) {
    const underscored = key.replace(/ /g, '_')

    if (underscored in schema) {
      key = underscored
    }

    const def = schema.find((s) => s.name === key)
    if (!def) continue

    output[key] = value
    if (def.type.type === 'bool') {
      output[key] = value.trim() === 'true' || value.trim() === 'yes'
    }
  }

  return output
}

export function tryJsonParseResponse(res: string) {
  if (typeof res === 'object') return res
  try {
    const json = JSON.parse(res)
    return json
  } catch (ex) {}

  try {
    const json = JSON.parse(res + '}')
    return json
  } catch (ex) {}

  try {
    if (res.trim().endsWith(',')) {
      const json = JSON.parse(res.slice(0, -1))
      return json
    }
  } catch (ex) {}

  return {}
}

export function onJsonTickHandler(
  schema: JsonField[],
  handler: (res: any, state: InferenceState) => void
) {
  let curr: any = {}
  const parser: TickHandler = (res, state) => {
    if (state === 'done') {
      const body = fromJsonResponse(schema, tryJsonParseResponse(res))
      if (Object.keys(body).length === 0) {
        handler(curr, state)
        return
      }

      handler(body, state)
      return
    }

    if (state === 'partial') {
      const body = fromJsonResponse(schema, tryJsonParseResponse(res))
      const keys = Object.keys(body).length
      if (keys === 0) return

      const changed = Object.keys(curr).length !== keys
      if (!changed) return

      Object.assign(curr, body)
      handler(curr, state)
      return
    }

    handler(curr, state)
  }

  return parser
}
