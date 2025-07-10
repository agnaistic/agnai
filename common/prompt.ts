import type { GenerateRequestV2, HistoryLine } from '../srv/adapter/type'
import type { AppSchema, TokenCounter } from './types'
import { AIAdapter, getAdapter, GOOGLE_LIMITS } from './adapters'
import { formatCharacter } from './characters'
import { defaultTemplate } from './mode-templates'
import { buildMemoryPrompt } from './memory'
import { defaultPresets, getFallbackPreset } from './presets'
import { parseTemplate } from './template-parser'
import { getMessageAuthor, getBotName, trimSentence, neat } from './util'
import { Memory } from './types'
import { promptOrderToTemplate, SIMPLE_ORDER } from './prompt-order'
import { ModelFormat, replaceArrayTags, replaceTags } from './presets/templates'
import { PromptTemplate } from './types/presets'
import { isDefaultPreset } from './default-preset'
import { OPENAI_CONTEXTS } from './presets/openai'
import { NOVEL_MODELS } from './presets/novel'

export type TickHandler<T = any> = (response: string, state: InferenceState, json?: T) => void

export type InferenceState = 'partial' | 'done' | 'error' | 'warning'

export const SAMPLE_CHAT_MARKER = `System: New conversation started. Previous conversations are examples only.`
export const SAMPLE_CHAT_PREAMBLE = `How {{char}} speaks:`

export type PromptLine = {
  type: 'insert' | 'history'
  line: string
  id?: string
  role: 'user' | 'model'
}

export type PromptPlaceholders = {
  scenario?: string
  greeting?: string
  sampleChat?: string[]
  persona: string
  allPersonas: string[]
  ujb?: string
  post: string[]
  prefill?: string
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
  lines: HistoryLine[]
  parts: PromptPlaceholders
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
  contextBuffer?: number
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
  history?: HistoryLine[]
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
      nextMsgs[i] = { ...nextMsgs[i], msg: trimSentence(nextMsgs[i].msg) || nextMsgs[i].msg }
    }

    opts.messages = nextMsgs

    if (opts.retry) {
      opts.retry = { ...opts.retry, msg: trimSentence(opts.retry.msg) || opts.retry.msg }
    }
  }

  const sortedMsgs = opts.messages.filter((msg) => msg.adapter !== 'image')

  opts.messages = sortedMsgs

  /**
   * The lines from `getLinesForPrompt` are returned in time-ascending order
   */
  let template = getTemplate(opts)

  /**
   * It's important for us to pass in a max context that is _realistic-ish_ as the embeddings
   * are retrieved based on the number of history messages we return here.
   *
   * If we ambitiously include the entire history then embeddings will never be included.
   * The queryable embeddings are messages that are _NOT_ included in the context
   */
  const contextBuffer = opts.contextBuffer ?? 0
  const maxContext = opts.settings ? getContextLimit(opts.user, opts.settings) : undefined
  const { lines } = await getLinesForPrompt(opts, encoder, (maxContext || 0) + contextBuffer)
  const parts = await buildPromptPlaceholders(
    opts,
    lines.map((l) => l.msg),
    encoder
  )

  const prompt = await injectPlaceholders(template, {
    opts,
    parts,
    history: lines.map((l) => l.msg),
    lastMessage: opts.lastMessage,
    characters: opts.characters,
    encoder,
    jsonValues: opts.jsonValues,
  })

  if (opts.modelFormat) {
    prompt.parsed = replaceTags(prompt.parsed, opts.modelFormat)
  }

  return { lines, parts, template: prompt }
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
export async function assemblePrompt(opts: GenerateRequestV2, encoder: TokenCounter) {
  const post = createPostPrompt(opts)
  const template = getTemplate(opts)

  let { parsed, inserts, length, sections, linesAddedCount, history, addedLines } =
    await injectPlaceholders(template, {
      opts,
      parts: opts.parts,
      history: opts.lines,
      characters: opts.characters,
      lastMessage: opts.lastMessage,
      encoder,
      jsonValues: opts.jsonValues,
      format: getFormatOverride(opts),
    })

  return {
    /** Parsed lines - Output of renderIterator if used */
    lines: history,

    /** Raw history lines in `Name: Message` format */
    unparsedLines: addedLines,

    /** New format when available */
    // history: opts.history,

    prompt: parsed,
    inserts,
    parts: opts.parts,
    post,
    length,
    sections,
    linesAddedCount,
  }
}

function getFormatOverride(
  opts: Pick<GenerateRequestV2, 'settings' | 'subscription'>
): ModelFormat | undefined {
  switch (opts.settings?.service) {
    case 'agnaistic':
      return opts.settings.modelFormat || opts.subscription?.preset?.modelFormat

    case 'openai':
    case 'third-party':
    case 'openrouter':
    case 'openrouter-completion':
      return 'None'

    case 'kobold':
      return opts.settings.modelFormat
  }
}

export function getTemplate(
  opts: Pick<GenerateRequestV2, 'settings' | 'chat'>,
  templates?: PromptTemplate[]
) {
  if (opts.settings?.promptTemplateId && templates) {
    const template = templates.find((t) => t._id === opts.settings?.promptTemplateId)
    if (template) return template.template
  }

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
  parts: PromptPlaceholders
  lastMessage?: string
  characters: Record<string, AppSchema.Character>
  jsonValues: Record<string, any> | undefined
  history?: string[]
  encoder: TokenCounter
  format?: ModelFormat
}

export async function injectPlaceholders(template: string, inject: InjectOpts) {
  const { opts, parts, history: hist, encoder, ...rest } = inject

  /**
   * This is currently disabled:
   * Models behave far too differently to insert sample chat using this method.
   * The formatting used here is far too opinionated.
   * Simple and Basic prompting w/ Prompt Formatting should have already solved this issue.
   * Advanced users authoring their own templates do so at their own peril.
   */
  // Basic templates can exclude example dialogue
  // const validate =
  //   opts.settings?.useAdvancedPrompt !== 'no-validation' &&
  //   opts.settings?.useAdvancedPrompt !== 'basic'

  // Automatically inject example conversation if not included in the prompt
  /** @todo assess whether or not this should be here -- it ignores 'unvalidated' prompt rules */
  // const sender = opts.impersonate?.name || inject.opts.sender?.handle || 'You'
  // const sampleChat = parts.sampleChat?.join('\n')
  // if (!template.match(HOLDERS.sampleChat) && sampleChat && hist && validate) {
  //   const next = hist.lines.filter((line) => !line.includes(SAMPLE_CHAT_MARKER))

  //   const svc = opts.settings?.service
  //   const postSample =
  //     svc === 'openai' || svc === 'openrouter' || svc === 'scale' || svc === 'openrouter-completion'
  //       ? SAMPLE_CHAT_MARKER
  //       : '<START>'

  //   const msg = `${SAMPLE_CHAT_PREAMBLE}\n${sampleChat}\n${postSample}`
  //     .replace(BOT_REPLACE, opts.replyAs.name)
  //     .replace(SELF_REPLACE, sender)
  //   if (hist.order === 'asc') next.unshift(msg)
  //   else next.push(msg)

  //   hist.lines = next
  // }

  const templateOpts = {
    ...opts,
    continue: opts.kind === 'continue',
    sender: inject.opts.sender,
    parts,
    lines: hist || [],
    ...rest,
  }

  if (parts.prefill) {
    parts.prefill = await parseTemplate(parts.prefill, { ...templateOpts }).then((t) => t.parsed)
  }

  const result = await parseTemplate(template, {
    ...templateOpts,
    limit: {
      context: getContextLimit(opts.user, opts.settings),
      encoder,
    },
  })

  const format = inject.format || opts.settings?.modelFormat || 'None'
  result.parsed = replaceTags(result.parsed, format)
  result.sections.strictSystem = replaceArrayTags(result.sections.strictSystem, format)
  replaceSectionTags(result.sections.sections, format)

  return result
}

function replaceSectionTags(sections: Record<string, string[] | any>, format: ModelFormat) {
  for (const key in sections) {
    if (!Array.isArray(sections[key])) continue
    sections[key] = replaceArrayTags(sections[key], format)
  }
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

export async function buildPromptPlaceholders(
  opts: PromptPartsOptions,
  lines: string[] | HistoryLine[],
  encoder: TokenCounter
) {
  const { chat, char, replyAs } = opts
  const sender = opts.impersonate ? opts.impersonate.name : opts.sender?.handle || 'You'

  const replace = (value: string, botName?: string) =>
    placeholderReplace(value, botName || opts.replyAs.name, sender)

  const parts: PromptPlaceholders = {
    systemPrompt: opts.settings?.systemPrompt || '',
    persona: replace(
      formatCharacter(
        replyAs.name,
        replyAs._id === char._id ? chat.overrides ?? replyAs.persona : replyAs.persona
      )
    ),
    prefill: opts.settings?.prefill || '',
    post: [],
    allPersonas: [],
    chatEmbeds: [],
    userEmbeds: [],
  }

  const personalities = new Set([replyAs._id])

  if (opts.impersonate?.persona) {
    parts.impersonality = replace(
      formatCharacter(
        opts.impersonate.name,
        opts.impersonate.persona,
        opts.impersonate.persona.kind
      )
    )
  }

  for (const bot of Object.values(opts.characters || {})) {
    if (!bot) continue
    if (personalities.has(bot._id)) continue
    if (bot._id === opts.impersonate?._id) continue

    const temp = opts.chat.tempCharacters?.[bot._id]
    if (temp?.deletedAt || temp?.favorite === false) continue

    if (!bot._id.startsWith('temp-') && !chat.characters?.[bot._id]) {
      continue
    }

    personalities.add(bot._id)
    parts.allPersonas.push(
      `${bot.name}'s personality: ${replace(
        formatCharacter(bot.name, bot.persona, bot.persona.kind),
        bot.name
      )}`
    )
  }

  // we use the BOT_REPLACE here otherwise later it'll get replaced with the
  // replyAs instead of the main character
  // (we always use the main character's scenario, not replyAs)
  parts.scenario = replace(opts.resolvedScenario, char.name)

  parts.sampleChat = (
    replyAs._id === char._id && !!chat.overrides
      ? chat.sampleChat ?? replyAs.sampleChat
      : replyAs.sampleChat
  )
    .split('\n')
    .filter(removeEmpty)
    // This will use the 'replyAs' character "if present", otherwise it'll defer to the chat.character.name
    .map((text) => replace(text))

  if (chat.greeting) {
    parts.greeting = replace(chat.greeting)
  } else {
    parts.greeting = replace(char.greeting)
  }

  const post = createPostPrompt(opts)

  if (opts.continue) {
    post.unshift(`${char.name}: ${opts.continue}`)
  }

  const books: AppSchema.MemoryBook[] = []
  if (replyAs.characterBook) books.push(replyAs.characterBook)
  if (opts.book) books.push(opts.book)

  parts.memory = await buildMemoryPrompt(
    { ...opts, books, lines: lines.map((l) => (typeof l === 'string' ? l : l.msg)) },
    encoder
  )

  const supplementary = getSupplementaryParts(opts, replyAs)
  parts.ujb = supplementary.ujb
  parts.systemPrompt = supplementary.system

  parts.post = post.map((post) => replace(post))

  if (opts.userEmbeds) {
    const embeds = opts.userEmbeds.map((line) => line.text)
    const { adding: fit } = await fillPromptWithLines({
      encoder,
      tokenLimit: opts.settings?.memoryUserEmbedLimit || 500,
      context: '',
      lines: embeds,
    })
    parts.userEmbeds = fit.map((l) => l.line)
  }

  if (opts.chatEmbeds) {
    const embeds = opts.chatEmbeds.map((line) => `${line.name}: ${line.text}`)
    const { adding: fit } = await fillPromptWithLines({
      encoder,
      tokenLimit: opts.settings?.memoryChatEmbedLimit || 500,
      context: '',
      lines: embeds,
    })
    parts.chatEmbeds = fit.map((l) => l.line)
  }

  return parts
}

function getSupplementaryParts(opts: PromptPartsOptions, replyAs: AppSchema.Character) {
  const { settings, chat } = opts
  const parts = {
    ujb: '' as string | undefined,
    system: '' as string | undefined,
  }

  if (!settings) return parts

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
  opts: PromptOpts,
  encoder: TokenCounter,
  maxContext?: number
): Promise<{ lines: HistoryLine[] }> {
  const { settings, members, messages } = opts
  maxContext = maxContext || getContextLimit(opts.user, settings)

  const profiles = new Map<string, AppSchema.Profile>()
  for (const member of members) {
    profiles.set(member.userId, member)
  }

  const formatMsg = (msg: AppSchema.ChatMessage): HistoryLine => {
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

    msg.msg = removeReasoning(msg.msg, settings?.reasoning)
    const filled = fillPlaceholders({ msg, author: author.name, char, user: sender }).trim()

    return { _id: msg._id, msg: filled, role: author.role }
  }

  const history = messages.map(formatMsg)

  const { adding: lines } = await fillPromptWithLines({
    encoder,
    tokenLimit: maxContext,
    context: '',
    lines: history.map((h) => h.msg),
  })

  if (opts.trimSentences) {
    return { lines: history.slice(-lines.length).map(trimAddedLine) }
  }

  return { lines: history.slice(-lines.length) }
}

function trimAddedLine(added: HistoryLine): HistoryLine {
  return { msg: trimSentence(added.msg), _id: added._id, role: added.role }
}

/** This function is not used for Claude or Chat */
export function formatInsert(insert: string): PromptLine {
  return { type: 'insert' as const, line: `${insert}\n`, role: 'user' }
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
  lines: string[] | HistoryLine[]
  unparsed?: HistoryLine[]

  /** Nodes to be inserted at a particular depth in the `lines` */
  inserts?: Map<number, string>
  optional?: Array<{ id: string; content: string }>
  marker?: string
}) {
  const { encoder, tokenLimit, context, lines, inserts = new Map(), optional = [] } = opts
  const insertsCost = await encoder(Array.from(inserts.values()).join(' '))
  const tokenLimitMinusInserts = tokenLimit - insertsCost

  /**
   * Optional placeholders do not count towards token counts.
   * They are optional after everything else has been inserted therefore we remove them from the prompt
   */
  let cleanContext = optional.reduce((amble, { id }) => amble.replace(id, ''), context)
  if (opts.marker) {
    cleanContext = cleanContext.replace(opts.marker, '')
  }

  let count = await encoder(cleanContext)
  const adding: PromptLine[] = []

  let linesAddedCount = 0

  // We count from the bottom as lines are in natural order
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    const rawLine = Array.isArray(opts.unparsed) ? opts.unparsed[i] : undefined

    const id = typeof line === 'string' ? rawLine?._id : line._id
    const text = typeof line === 'string' ? line : line.msg
    const tokens = await encoder(text)
    if (tokens + count > tokenLimitMinusInserts) {
      break
    }
    const insert = inserts.get(linesAddedCount)
    if (insert) adding.unshift(formatInsert(insert))

    count += tokens

    /**
     * @TODO ~~Double check the role is correct here~~
     * Role here is correct: If `lines` is `string[]` then we're filling embeds.
     */
    adding.unshift({
      type: 'history',
      line: text,
      id,
      role: typeof line === 'string' ? (rawLine ? rawLine.role : 'user') : line.role,
    })
    linesAddedCount++
  }

  // We don't omit inserts with depth > message count in context size
  // instead we put them at the top of the conversation history
  const remainingInserts = insertsDeeperThanConvoHistory(inserts, linesAddedCount)
  if (remainingInserts) {
    // Unshift so they get added at the top
    // They haven't been added due to the chat history length being smaller than the insert depth
    adding.unshift(formatInsert(remainingInserts))
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

export function getChatPreset(
  chat: AppSchema.Chat,
  user: AppSchema.User,
  userPresets: AppSchema.UserGenPreset[]
): Partial<AppSchema.UserGenPreset> {
  /**
   * Order of precedence:
   * 1. chat.genPreset
   * 2. user.defaultPreset
   * 3. user.servicePreset -- Deprecated: Service presets are completely removed apart from users that already have them.
   * 4. built-in fallback preset (horde)
   */

  // #1
  if (chat.genPreset) {
    if (isDefaultPreset(chat.genPreset))
      return { _id: chat.genPreset, ...defaultPresets[chat.genPreset] }

    const preset = userPresets.find((preset) => preset._id === chat.genPreset)
    if (preset) return preset
  }

  // #2
  const defaultId = user.defaultPreset
  if (defaultId) {
    if (isDefaultPreset(defaultId)) return { _id: defaultId, ...defaultPresets[defaultId] }
    const preset = userPresets.find((preset) => preset._id === defaultId)
    if (preset) return preset
  }

  // #3
  const { adapter, isThirdParty } = getAdapter(chat, user, undefined)
  const fallbackId = user.defaultPresets?.[isThirdParty ? 'kobold' : adapter]

  if (fallbackId) {
    if (isDefaultPreset(fallbackId)) return { _id: fallbackId, ...defaultPresets[fallbackId] }
    const preset = userPresets.find((preset) => preset._id === fallbackId)
    if (preset) return preset
  }

  // #4
  return getFallbackPreset(adapter || 'horde')
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
  const genAmount = gen?.maxTokens || getFallbackPreset(gen?.service || 'horde')?.maxTokens || 300
  const configuredMax =
    gen?.maxContextLength || getFallbackPreset(gen?.service || 'horde')?.maxContextLength || 8192

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

    case 'third-party':
    case 'kobold': {
      if (!gen.useMaxContext) return configuredMax - genAmount
      switch (gen.thirdPartyFormat) {
        case 'gemini': {
          const max = GOOGLE_LIMITS[gen.googleModel!] || GOOGLE_LIMITS.fallback
          return max ? max - genAmount : configuredMax - genAmount
        }

        default:
          return configuredMax - genAmount
      }
    }

    case 'novel': {
      const model = gen?.novelModel || NOVEL_MODELS.kayra_v1
      if (model === NOVEL_MODELS.clio_v1 || model === NOVEL_MODELS.kayra_v1) {
        return configuredMax - genAmount
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
    case 'claude-v2':
      return configuredMax - genAmount

    case 'goose':
      return configuredMax - genAmount

    case 'openrouter-completion':
    case 'openrouter':
      if (gen?.openRouterModel?.context_length && gen.useMaxContext) {
        return gen.openRouterModel.context_length - genAmount
      }

      return configuredMax - genAmount

    case 'mancer':
      return configuredMax - genAmount

    case 'venus':
      return configuredMax - genAmount
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

  // The scenario `{{char}}` placeholders must always refer to the owner of the scenario
  result.replace(/{{char}}/gi, mainChar.name)

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

function removeReasoning(msg: string, reasoning: AppSchema.GenSettings['reasoning']) {
  const start = (reasoning?.start || '<think>').trim()
  const end = (reasoning?.end || '</think>').trim()

  if (!start || !end) return msg

  while (true) {
    let startIndex = msg.indexOf(start)
    const endIndex = msg.indexOf(end)
    if (startIndex < 0) {
      if (endIndex >= 0) {
        startIndex = 0
      } else {
        break
      }
    }

    if (endIndex > startIndex) {
      const thought = msg.slice(startIndex, endIndex + end.length)
      msg = msg.replace(thought, '')
      continue
    }

    const thought = msg.slice(startIndex)
    if (thought) {
      msg = msg.replace(thought, '')
    }
  }

  return msg.trim()
}
