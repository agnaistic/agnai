import { AIAdapter } from '../../common/adapters'
import {
  mapPresetsToAdapter,
  defaultPresets,
  isDefaultPreset,
  getFallbackPreset,
} from '../../common/presets'
import { store } from '../db'
import { AppSchema } from '../db/schema'
import { AppLog } from '../logger'
import { errors, StatusError } from '../api/wrap'
import { handleHorde } from './horde'
import { handleKobold } from './kobold'
import { FILAMENT_ENABLED, filament, handleLuminAI } from './luminai'
import { handleNovel } from './novel'
import { handleOoba } from './ooba'
import { handleOAI } from './openai'
import { handleClaude } from './claude'
import { GenerateRequestV2, ModelAdapter } from './type'
import { createPromptWithParts, getAdapter, getPromptParts, trimTokens } from '../../common/prompt'
import { handleScale } from './scale'
import { MemoryOpts } from '../../common/memory'
import { configure } from '../../common/horde-gen'
import needle from 'needle'
import { HORDE_GUEST_KEY } from '../api/horde'
import { getEncoder } from '../tokenize'

configure(async (opts) => {
  const res = await needle(opts.method, opts.url, opts.payload, {
    json: true,
    headers: { 'Content-Type': 'application/json', apikey: opts.key || HORDE_GUEST_KEY },
  })

  return { body: res.body, statusCode: res.statusCode, statusMessage: res.statusMessage }
})

const handlers: { [key in AIAdapter]: ModelAdapter } = {
  novel: handleNovel,
  kobold: handleKobold,
  ooba: handleOoba,
  horde: handleHorde,
  luminai: handleLuminAI,
  openai: handleOAI,
  scale: handleScale,
  claude: handleClaude,
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
    const entities = await getResponseEntities(opts.chat, opts.sender.userId)
    const { adapter, isThirdParty, model } = getAdapter(opts.chat, entities.user, entities.settings)
    const encoder = getEncoder(adapter, model)
    opts.parts = getPromptParts(
      { ...entities, settings: entities.gen, chat: opts.chat, members: opts.members },
      opts.lines,
      encoder
    )
    opts.settings = entities.gen
    opts.user = entities.user
    opts.settings = entities.gen
    opts.char = entities.char

    // Use pipeline
    const memory = await getMemoryPrompt({ ...opts, book: entities.book }, log)
    if (memory) {
      opts.parts.memory = memory
    }
  }

  const { adapter, isThirdParty, model } = getAdapter(opts.chat, opts.user, opts.settings)
  const encoder = getEncoder(adapter, model)
  const handler = handlers[adapter]

  const prompt = createPromptWithParts(opts, opts.parts, opts.lines, encoder)

  const gen = opts.settings || getFallbackPreset(adapter)
  const settings = mapPresetsToAdapter(gen, adapter)
  const stream = handler({
    kind: opts.kind,
    char: opts.char,
    chat: opts.chat,
    gen: opts.settings || {},
    log,
    members: opts.members.concat(opts.sender),
    prompt: prompt.prompt,
    parts: prompt.parts,
    sender: opts.sender,
    settings,
    user: opts.user,
    guest: guestSocketId,
    lines: opts.lines,
    isThirdParty,
  })

  return { stream, adapter }
}

export async function getResponseEntities(chat: AppSchema.Chat, senderId: string) {
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

  const { adapter, model } = getAdapter(chat, user)
  const gen = await getGenerationSettings(user, chat, adapter)
  const settings = mapPresetsToAdapter(gen, adapter)

  return { char, user, adapter, settings, gen, model, book }
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

/**
 * This technically falls into the 'pipeline' category.
 * For now we'll keep this imperative to avoid creating a bad abstraction.
 *
 * @param opts
 */
async function getMemoryPrompt(opts: MemoryOpts, log: AppLog) {
  const { adapter, model } = getAdapter(opts.chat, opts.user, opts.settings)
  const encoder = getEncoder(adapter, model)
  if (FILAMENT_ENABLED && opts.user.luminaiUrl && opts.book) {
    const res = await filament
      .retrieveMemories(opts.user, opts.book._id, opts.lines)
      .catch((error) => ({ error }))

    // If we fail, we'll revert to the naive memory retrival
    if ('error' in res) {
      return
    }

    const memories = res.map((res) => res.entry)
    const tokenLimit = opts.settings?.memoryContextLimit || defaultPresets.basic.memoryContextLimit
    const prompt = trimTokens({ input: memories, start: 'top', tokenLimit, encoder })
    return prompt.join('\n')
  }

  return
}
