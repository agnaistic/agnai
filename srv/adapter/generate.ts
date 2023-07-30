import { AIAdapter } from '../../common/adapters'
import {
  mapPresetsToAdapter,
  defaultPresets,
  isDefaultPreset,
  getFallbackPreset,
  getInferencePreset,
} from '/common/presets'
import { store } from '../db'
import { AppSchema } from '../../common/types/schema'
import { AppLog, logger } from '../logger'
import { errors, StatusError } from '../api/wrap'
import { handleHorde } from './horde'
import { handleKobold } from './kobold'
import { handleNovel } from './novel'
import { handleOoba } from './ooba'
import { handleOAI } from './openai'
import { handleClaude } from './claude'
import { GenerateRequestV2, ModelAdapter } from './type'
import { createPromptWithParts, getAdapter, getPromptParts } from '../../common/prompt'
import { handleScale } from './scale'
import { configure } from '../../common/horde-gen'
import needle from 'needle'
import { HORDE_GUEST_KEY } from '../api/horde'
import { getEncoder } from '../tokenize'
import { handleGooseAI } from './goose'
import { handleReplicate } from './replicate'
import { getAppConfig } from '../api/settings'
import { handleOpenRouter } from './openrouter'

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

const handlers: { [key in AIAdapter]: ModelAdapter } = {
  novel: handleNovel,
  kobold: handleKobold,
  ooba: handleOoba,
  horde: handleHorde,
  openai: handleOAI,
  scale: handleScale,
  claude: handleClaude,
  goose: handleGooseAI,
  replicate: handleReplicate,
  openrouter: handleOpenRouter,
}

type InferenceRequest = {
  prompt: string
  guest?: string
  user: AppSchema.User

  /** Follows the formats:
   * - [service]/[model] E.g. novel/krake-v2
   * - [service] E.g. novel
   */
  service: string
  log: AppLog
  retries?: number
  maxTokens?: number
}

export async function inferenceAsync(opts: InferenceRequest) {
  const retries = opts.retries ?? 0
  let error: any

  for (let attempt = 0; attempt <= retries; attempt++) {
    const { stream } = await createInferenceStream(opts)

    let generated = ''
    let meta: any = {}
    let prompt = ''
    for await (const gen of stream) {
      if (typeof gen === 'string') {
        generated = gen
        continue
      }

      if ('partial' in gen) {
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
    return { generated, prompt, meta }
  }

  if (error) throw error
  throw new Error(`Could not complete inference: Max retries exceeded`)
}

export async function createInferenceStream(opts: InferenceRequest) {
  const [service, model] = opts.service.split('/')
  const settings = getInferencePreset(opts.user, service as AIAdapter, model)

  if (model) {
    switch (service as AIAdapter) {
      case 'openai':
        settings.oaiModel = model
        break

      case 'claude':
        settings.claudeModel = model
        break

      case 'novel':
        settings.novelModel = model
        break
    }
  }

  settings.maxTokens = opts.maxTokens ? opts.maxTokens : 1024
  settings.streamResponse = false
  settings.temp = 0.5

  if (settings.service === 'openai') {
    settings.topP = 1
    settings.frequencyPenalty = 0
    settings.presencePenalty = 0
  }

  const handler = handlers[settings.service!]
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
  })

  return { stream }
}

export async function createTextStreamV2(
  opts: GenerateRequestV2,
  log: AppLog,
  guestSocketId?: string
) {
  /**
   * N.b.: The front-end sends the `lines` and `history` in TIME-ASCENDING order. I.e. Oldest -> Newest
   *
   * We need to ensure the prompt is always generated using the correct version of the memory book.
   * If a non-owner initiates generation, they will not have the memory book.
   *
   * Everything else should be update to date at this point
   */
  if (!guestSocketId) {
    const entities = await getResponseEntities(opts.chat, opts.sender.userId, opts.settings)
    const { adapter, model } = getAdapter(opts.chat, entities.user, entities.gen)
    const encoder = getEncoder(adapter, model)
    opts.parts = getPromptParts(
      {
        ...entities,
        sender: opts.sender,
        kind: opts.kind,
        settings: entities.gen,
        chat: opts.chat,
        members: opts.members,
        replyAs: opts.replyAs,
        impersonate: opts.impersonate,
        characters: opts.characters,
        chatEmbeds: opts.chatEmbeds || [],
        userEmbeds: opts.userEmbeds || [],
      },
      [...opts.lines].reverse(),
      encoder
    )
    opts.settings = entities.gen
    opts.user = entities.user
    opts.settings = entities.gen
    opts.char = entities.char
  }

  if (opts.settings?.thirdPartyUrl) {
    opts.user.koboldUrl = opts.settings.thirdPartyUrl
  }

  if (opts.settings?.thirdPartyFormat) {
    opts.user.thirdPartyFormat = opts.settings.thirdPartyFormat
  }
  if (!opts.settings) {
    opts.settings = {}
  }

  if (opts.kind.startsWith('send-event:')) {
    opts.settings!.useTemplateParser = true
  }

  const { adapter, isThirdParty, model } = getAdapter(opts.chat, opts.user, opts.settings)
  const encoder = getEncoder(adapter, model)
  const handler = handlers[adapter]

  const prompt = createPromptWithParts(opts, opts.parts, opts.lines, encoder)

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
  })

  return { stream, adapter, settings: gen, user: opts.user }
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

  return { char, user, adapter, settings, gen: genSettings, model, book }
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
