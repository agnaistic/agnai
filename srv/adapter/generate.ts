import { AIAdapter, MODE_SETTINGS } from '../../common/adapters'
import {
  mapPresetsToAdapter,
  defaultPresets,
  isDefaultPreset,
  getFallbackPreset,
} from '/common/presets'
import { store } from '../db'
import { AppSchema } from '../../common/types/schema'
import { AppLog, logger } from '../middleware'
import { errors, StatusError } from '../api/wrap'
import { GenerateRequestV2 } from './type'
import {
  assemblePrompt,
  getAdapter,
  buildPromptParts,
  resolveScenario,
  JsonField,
  getContextLimit,
} from '../../common/prompt'
import { configure } from '../../common/horde-gen'
import needle from 'needle'
import { HORDE_GUEST_KEY } from '../api/horde'
import { getTokenCounter } from '../tokenize'
import { getAppConfig } from '../api/settings'
import { SubscriptionPreset, getHandlers, getSubscriptionPreset } from './agnaistic'
import { deepClone, getSubscriptionModelLimits, parseStops, tryParse } from '/common/util'
import { isDefaultTemplate, templates } from '/common/presets/templates'
import {
  GuidanceParams,
  calculateGuidanceCounts,
  runGuidance,
} from '/common/guidance/guidance-parser'
import { getCachedSubscriptionModels } from '../db/subscriptions'
import { sendOne } from '../api/ws'
import { ResponseSchema } from '/common/types/library'
import { toChatMessages } from './template-chat-payload'

let version = ''

configure(async (opts) => {
  if (!version) {
    const appConfig = await getAppConfig()
    version = appConfig.version
  }

  const res = await needle(opts.method, opts.url, opts.payload, {
    json: true,
    headers: {
      'Content-Type': 'application/json',
      apikey: opts.key || HORDE_GUEST_KEY,
      'Client-Agent': `Agnaistic:${version}:`,
    },
  })

  return { body: res.body, statusCode: res.statusCode, statusMessage: res.statusMessage }
}, logger)

export type ResponseEntities = Awaited<ReturnType<typeof getResponseEntities>>

export type InferenceRequest = {
  requestId?: string
  prompt: string
  guest?: string
  user: AppSchema.User
  settings?: Partial<AppSchema.UserGenPreset>
  maxKnownLines?: number

  guidance?: boolean
  placeholders?: any
  previous?: any
  lists?: Record<string, string[]>

  /** Follows the formats:
   * - [service]/[model] E.g. novel/krake-v2
   * - [service] E.g. novel
   */
  // service: string
  log: AppLog
  retries?: number
  maxTokens?: number
  temp?: number
  stop?: string[]
  reguidance?: string[]

  imageData?: string

  jsonSchema?: any
  jsonValues?: Record<string, any>
}

export async function inferenceAsync(opts: InferenceRequest) {
  const retries = opts.retries ?? 0
  let error: any

  for (let attempt = 0; attempt <= retries; attempt++) {
    const { stream, service } = await createInferenceStream(opts)

    let generated = ''
    let meta: any = {}
    let prompt = ''
    for await (const gen of stream) {
      if (typeof gen === 'string') {
        generated = gen
        continue
      }

      if ('partial' in gen && gen.partial) {
        const partial = tryParse(gen.partial)
        if (!partial || typeof partial !== 'object') continue
        sendOne(opts.user._id, {
          type: 'guidance-partial',
          partial,
          adapter: service,
          requestId: opts.requestId,
        })
        continue
      }

      if ('meta' in gen) {
        Object.assign(meta, gen.meta)
        continue
      }

      if ('prompt' in gen) {
        prompt = gen.prompt
        continue
      }

      if ('error' in gen) {
        error = gen.error
        if (attempt >= retries) {
          throw new Error(gen.error)
        }
      }
    }

    if (opts.guidance && opts.settings?.service === 'agnaistic') {
      try {
        const values = JSON.parse(generated)
        return { generated, prompt, meta, values: Object.assign({}, opts.previous, values) }
      } catch (ex) {}
    }

    return { generated, prompt, meta }
  }

  if (error) throw error
  throw new Error(`Could not complete inference: Max retries exceeded`)
}

export async function guidanceAsync(opts: InferenceRequest) {
  const settings = await getRequestPreset(opts)
  const sub = await getSubscriptionPreset(opts.user, !!opts.guest, opts.settings || settings)

  const previous = { ...opts.previous }

  for (const name of opts.reguidance || []) {
    delete previous[name]
  }

  const infer = async (params: GuidanceParams, v2: boolean) => {
    const inference = await inferenceAsync({
      ...opts,
      previous,
      prompt: params.prompt,
      settings,
      maxTokens: params.tokens,
      stop: params.stop,
      guidance: v2,
    })
    return inference
  }

  if (sub?.preset?.guidanceCapable && (sub.tier?.guidanceAccess || opts.user.admin)) {
    const srv = await store.admin.getServerConfiguration()
    const counts = calculateGuidanceCounts(opts.prompt, opts.placeholders)
    if (srv.maxGuidanceTokens && counts.tokens > srv.maxGuidanceTokens) {
      throw new Error(`Cannot run guidance: Template is requesting too many tokens (>1000)`)
    }

    if (srv.maxGuidanceVariables && counts.vars > srv.maxGuidanceVariables) {
      throw new Error(`Cannot run guidance: Template requests too many variables (>15)`)
    }

    const result = await infer({ prompt: opts.prompt, tokens: 200, stop: opts.stop }, true)
    if (!result.values) {
      try {
        const values = JSON.parse(result.generated)
        result.values = values
      } catch (ex) {
        opts.log.error({ result }, 'Failed to JSON parse guidance result')
        throw ex
      }
    }
    return result
  }

  const result = await runGuidance(opts.prompt, {
    infer: (params) => infer(params, false).then((res) => res.generated),
    reguidance: opts.reguidance,
    placeholders: opts.placeholders,
    previous,
  })

  return result
}

export async function createInferenceStream(opts: InferenceRequest) {
  const settings = await getRequestPreset(opts)

  if (opts.stop) {
    settings.stopSequences = opts.stop
  }

  const handler = getHandlers(settings)
  const stream = handler({
    kind: 'plain',
    requestId: '',
    char: {} as any,
    chat: {} as any,
    gen: settings,
    log: opts.log,
    lines: [],
    members: [],
    guest: opts.guest,
    user: opts.user,
    replyAs: {} as any,
    parts: { persona: '', post: [], allPersonas: [], chatEmbeds: [], userEmbeds: [] },
    prompt: opts.prompt,
    sender: {} as any,
    mappedSettings: mapPresetsToAdapter(settings, settings.service!),
    impersonate: undefined,
    guidance: opts.guidance,
    previous: opts.previous,
    placeholders: opts.placeholders,
    characters: {},
    lists: opts.lists,
    jsonSchema: opts.jsonSchema,
    imageData: opts.imageData,
    jsonValues: opts.jsonValues,
  })

  return { stream, service: settings.service || '' }
}

async function getRequestPreset(opts: InferenceRequest) {
  let preset: Partial<AppSchema.GenSettings> | undefined

  if (opts.settings) {
    const model = getCachedSubscriptionModels().find((m) => m._id === opts.settings?._id)
    if (model) {
      preset = model
    } else {
      preset = opts.settings
    }
  } else if (opts.user.defaultPreset) {
    if (isDefaultPreset(opts.user.defaultPreset)) {
      preset = deepClone(defaultPresets[opts.user.defaultPreset])
    }

    const user = await store.presets.getUserPreset(opts.user.defaultPreset)
    if (user) {
      preset = user
    }
  } else {
    const models = getCachedSubscriptionModels()
    const model = models.find((m) => m.isDefaultSub)
    if (model) {
      preset = model
    }
  }

  if (!preset) {
    throw new StatusError('Could not locate preset for inference request', 400)
  }

  if (preset.thirdPartyUrl) {
    opts.user.koboldUrl = preset.thirdPartyUrl
  }

  if (preset.thirdPartyFormat) {
    opts.user.thirdPartyFormat = preset.thirdPartyFormat
  }

  return preset
}

export async function createChatStream(
  opts: GenerateRequestV2 & { entities?: ResponseEntities; chatSchema?: ResponseSchema },
  log: AppLog,
  guestSocketId?: string
) {
  const entities = opts.entities

  if (entities) {
    opts.settings = entities.gen
    opts.user = entities.user
    opts.char = entities.char
    entities.gen.temporary = opts.settings?.temporary
  }

  const subscription = await getSubscriptionPreset(opts.user, !!guestSocketId, opts.settings)

  /**
   * Only use a JSON schema if:
   * - Service allows it
   * - User preset has it enabled
   * - User preset has specified a schema
   * - There is both a history and response template
   */
  let jsonSchema: JsonField[] | undefined
  if (
    subscription?.preset?.jsonSchemaCapable &&
    opts.entities?.gen.jsonEnabled &&
    opts.chatSchema
  ) {
    jsonSchema = opts.chatSchema.schema
  }

  const fallbackContext = subscription?.preset?.maxContextLength
  const modelContext = subscription
    ? getSubscriptionModelLimits(subscription?.preset, subscription.level)?.maxContextLength
    : undefined

  const subContextLimit = modelContext || fallbackContext
  opts.settings = opts.settings || {}

  if (subContextLimit) {
    opts.settings.maxContextLength = Math.min(
      subContextLimit,
      opts.settings.maxContextLength ?? 4096
    )
  }

  /**
   * N.b.: The front-end sends the `lines` and `history` in TIME-ASCENDING order. I.e. Oldest -> Newest
   *
   * We need to ensure the prompt is always generated using the correct version of the memory book.
   * If a non-owner initiates generation, they will not have the memory book.
   *
   * Everything else should be up to date at this point
   */

  if (entities) {
    const { adapter, model } = getAdapter(opts.chat, entities.user, entities.gen)
    const encoder = getTokenCounter(adapter, model)
    const nextSettings = simplifyPreset(opts.user, entities.gen, subscription)
    opts.settings = nextSettings
    opts.parts = await buildPromptParts(
      {
        ...entities,
        sender: opts.sender,
        kind: opts.kind,
        settings: nextSettings,
        chat: opts.chat,
        members: opts.members,
        replyAs: opts.replyAs,
        impersonate: opts.impersonate,
        characters: opts.characters,
        chatEmbeds: opts.chatEmbeds || [],
        userEmbeds: opts.userEmbeds || [],
        resolvedScenario: entities.resolvedScenario,
      },
      [...opts.lines].reverse(),
      encoder
    )
  }

  if (opts.settings?.thirdPartyUrl) {
    opts.user.koboldUrl = opts.settings.thirdPartyUrl
  }

  if (opts.settings?.thirdPartyFormat) {
    opts.user.thirdPartyFormat = opts.settings.thirdPartyFormat
  }

  if (opts.settings?.stopSequences) {
    opts.settings.stopSequences = parseStops(opts.settings.stopSequences)
  }

  if (opts.settings?.phraseBias) {
    opts.settings.phraseBias = opts.settings.phraseBias
      .map(({ seq, bias }) => ({ seq: seq.replace(/\\n/g, '\n'), bias }))
      .filter((pb) => !!pb.seq)
  }

  const { adapter, isThirdParty, model } = getAdapter(opts.chat, opts.user, opts.settings)
  const encoder = getTokenCounter(adapter, model, subscription?.preset)
  const handler = getHandlers(opts.settings)

  /**
   * Context limits set by the subscription need to be present before the prompt is finalised.
   * We never need to use the users context length here as the subscription should contain the maximum possible context length.
   */

  const prompt = await assemblePrompt(opts, opts.parts, opts.lines, encoder)
  if (prompt.linesAddedCount === 0 && opts.linesCount) {
    throw new StatusError(
      `Could not fit any messages in prompt. Check your character definition, context size, and template`,
      400
    )
  }

  const messages = await toChatMessages(opts, prompt, encoder)

  const size = encoder(
    [
      opts.parts.sampleChat,
      opts.parts.scenario,
      opts.parts.memory,
      opts.parts.systemPrompt,
      opts.parts.ujb,
      opts.parts.persona,
    ]
      .filter((l) => !!l)
      .join('\n')
  )

  if (opts.impersonate) {
    Object.assign(opts.characters, { impersonated: opts.impersonate })
  }

  const gen = opts.settings || getFallbackPreset(adapter)
  const mappedSettings = mapPresetsToAdapter(gen, adapter)
  const stream = handler({
    requestId: opts.requestId,
    kind: opts.kind,
    char: opts.char,
    chat: opts.chat,
    gen: opts.settings || {},
    log,
    members: opts.members.concat(opts.sender),
    prompt: prompt.prompt,
    messages,
    parts: prompt.parts,
    sender: opts.sender,
    mappedSettings,
    user: opts.user,
    guest: guestSocketId,
    lines: prompt.lines,
    isThirdParty,
    replyAs: opts.replyAs,
    characters: opts.characters,
    impersonate: opts.impersonate,
    lastMessage: opts.lastMessage,
    imageData: opts.imageData,
    jsonSchema: jsonSchema || opts.jsonSchema,
    reschemaPrompt: opts.reschemaPrompt,
    subscription,
    encoder,
    jsonValues: opts.jsonValues,
    contextSize: prompt.length,
  })

  return {
    stream,
    adapter,
    settings: gen,
    user: opts.user,
    size,
    length: prompt.length,
    json: !!jsonSchema || !!opts.jsonSchema,
  }
}

export async function getResponseEntities(
  chat: AppSchema.Chat,
  senderId: string,
  gen: Partial<AppSchema.GenSettings> | undefined
) {
  const isOwnerOrMember = senderId === chat.userId || chat.memberIds.includes(senderId)
  if (!isOwnerOrMember) {
    throw errors.Forbidden
  }

  const user = await store.users.getUser(chat.userId)
  if (!user) {
    throw errors.Forbidden
  }

  const book = chat.memoryId ? await store.memory.getBook(chat.memoryId) : undefined

  const char = await store.characters.getCharacter(chat.userId, chat.characterId)
  if (!char) {
    throw new StatusError('Character not found', 404)
  }

  const { adapter, model } = getAdapter(chat, user, gen)
  const genSettings = await getGenerationSettings(user, chat, adapter)
  const settings = mapPresetsToAdapter(genSettings, adapter)

  const chatScenarios = chat.scenarioIds
    ? await store.scenario.getScenariosById(chat.scenarioIds)
    : []
  const resolvedScenario = resolveScenario(chat, char, chatScenarios)

  if (genSettings.promptTemplateId) {
    if (isDefaultTemplate(genSettings.promptTemplateId)) {
      genSettings.gaslight = templates[genSettings.promptTemplateId]
    } else {
      const template = await store.presets.getTemplate(genSettings.promptTemplateId)
      if (template?.userId === chat.userId) {
        genSettings.gaslight = template.template
      }
    }
  }

  return { char, user, adapter, settings, gen: genSettings, model, book, resolvedScenario }
}

async function getGenerationSettings(
  user: AppSchema.User,
  chat: AppSchema.Chat,
  adapter: AIAdapter,
  guest?: boolean
): Promise<Partial<AppSchema.GenSettings>> {
  if (chat.genPreset) {
    if (isDefaultPreset(chat.genPreset)) {
      return { ...defaultPresets[chat.genPreset], src: 'user-chat-genpreset-default' }
    }

    if (guest) {
      if (chat.genSettings) return { ...chat.genSettings, src: 'guest-chat-gensettings' }
      return { ...getFallbackPreset(adapter), src: 'guest-fallback' }
    }

    const preset = await store.presets.getUserPreset(chat.genPreset)
    if (preset) {
      preset.src = 'user-chat-genpreset-custom'
      return preset
    }
  }

  if (chat.genSettings) {
    const src = guest ? 'guest-chat-gensettings' : 'user-chat-gensettings'
    return { ...chat.genSettings, src }
  }

  if (user.defaultPreset) {
    if (isDefaultPreset(user.defaultPreset)) {
      return { ...defaultPresets[user.defaultPreset], src: 'user-settings-genpreset-default' }
    }

    const preset = await store.presets.getUserPreset(user.defaultPreset)
    if (preset) {
      preset.src = 'user-settings-genpreset-custom'
      return preset
    }
  }

  const servicePreset = user.defaultPresets?.[adapter]
  if (servicePreset) {
    if (isDefaultPreset(servicePreset)) {
      return {
        ...defaultPresets[servicePreset],
        src: `${guest ? 'guest' : 'user'}-service-defaultpreset`,
      }
    }

    // No user presets are persisted for anonymous users
    // Do not try to check the database for them
    if (guest) {
      return { ...getFallbackPreset(adapter), src: 'guest-fallback' }
    }

    const preset = await store.presets.getUserPreset(servicePreset)
    if (preset) {
      preset.src = 'user-service-custom'
      return preset
    }
  }

  return {
    ...getFallbackPreset(adapter),
    src: guest ? 'guest-fallback-last' : 'user-fallback-last',
  }
}

function simplifyPreset(
  user: AppSchema.User,
  gen: Partial<AppSchema.GenSettings>,
  sub?: SubscriptionPreset
): Partial<AppSchema.GenSettings> {
  const next: Partial<AppSchema.GenSettings> = { ...gen }

  if (gen.useMaxContext || gen.presetMode === 'simple') {
    gen.useMaxContext = true
    next.maxContextLength = getContextLimit(user, next) + (gen.maxTokens ?? 0)
  }

  if (!gen.presetMode || gen.presetMode === 'advanced') return next

  const keep: any = {}

  for (const [prop, usable] of Object.entries(MODE_SETTINGS[gen.presetMode] || {})) {
    if (!usable) continue
    const value = (gen as any)[prop]
    if (value !== undefined) {
      keep[prop] = value
    }
  }

  Object.assign(next, sub?.preset || {}, keep, { useMaxContext: true })

  return next
}
