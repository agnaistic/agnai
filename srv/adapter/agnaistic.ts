import { sendOne } from '../api/ws'
import { config } from '../config'
import { store } from '../db'
import { isConnected } from '../db/client'
import { getCachedSubscriptions } from '../db/subscriptions'
import { decryptText } from '../db/util'
import { handleClaude } from './claude'
import { handleGooseAI } from './goose'
import { handleHorde } from './horde'
import { handleThirdParty } from './kobold'
import { handleMancer } from './mancer'
import { handleNovel } from './novel'
import { handleOAI } from './openai'
import { handleOpenRouter } from './openrouter'
import { getThirdPartyPayload } from './payloads'
import { handlePetals } from './petals'
import { registerAdapter } from './register'
import { handleReplicate } from './replicate'
import { handleScale } from './scale'
import { websocketStream } from './stream'
import { ModelAdapter } from './type'
import { AIAdapter, AdapterSetting } from '/common/adapters'
import { AppSchema } from '/common/types'
import { parseStops } from '/common/util'
import { getTextgenCompletion } from './dispatch'
import { handleVenus } from './venus'
import { sanitise, sanitiseAndTrim, trimResponseV2 } from '/common/requests/util'
import { obtainLock, releaseLock } from '../api/chat/lock'
import { getServerConfiguration } from '../db/admin'
import { handleGemini } from './gemini'

export type SubscriptionPreset = Awaited<NonNullable<ReturnType<typeof getSubscriptionPreset>>>

export async function getSubscriptionPreset(
  user: AppSchema.User,
  guest: boolean,
  gen?: Partial<AppSchema.GenSettings>
) {
  if (!isConnected()) return
  if (!gen) return
  if (gen.service !== 'agnaistic') return

  const tier = store.users.getUserSubTier(user)
  const level = user.admin ? 999999 : tier?.level ?? -1
  let error: string | undefined = undefined
  let warning: string | undefined = undefined

  const fallback = await store.subs.getDefaultSubscription()
  const subId = gen.registered?.agnaistic?.subscriptionId
  let preset = subId ? await store.subs.getSubscription(subId) : fallback

  if (guest && preset?.allowGuestUsage === false) {
    error = 'Please sign in to use this model.'
  }

  if (preset?.stopSequences) {
    preset.stopSequences = parseStops(preset.stopSequences)
  }

  if (!preset || preset.subDisabled) {
    // If the subscription they're using becomes unavailable, gracefully fallback to the default and let them know
    if (fallback && !fallback.subDisabled && fallback.subLevel <= level) {
      preset = fallback
      warning =
        'Your configured Agnaistic model is no longer available. Using a fallback. Please update your preset.'
    } else {
      error = 'Model selected is invalid or disabled. Try another.'
    }
  }

  return { level, preset, error, warning, tier: tier?.tier }
}

export const handleAgnaistic: ModelAdapter = async function* (opts) {
  const { char, members, prompt, log, gen } = opts

  if ('subscription' in opts === false) {
    opts.subscription = await getSubscriptionPreset(opts.user, !!opts.guest, opts.gen)
  }

  if (!opts.subscription || !opts.subscription.preset) {
    yield { error: 'Subscriptions are not enabled' }
    return
  }

  if (opts.subscription.error) {
    yield { error: opts.subscription.error }
    return
  }

  if (opts.subscription.warning) {
    yield { warning: opts.subscription.warning }
  }

  const level = opts.user.admin ? 99999 : opts.subscription.level ?? -1
  const subPreset = opts.subscription.preset

  let newLevel = await store.users.validateSubscription(opts.user)
  if (newLevel === undefined) {
    newLevel = -1
  }

  if (newLevel instanceof Error) {
    yield { error: newLevel.message }
    return
  }

  if (subPreset.subLevel > -1 && subPreset.subLevel > newLevel) {
    opts.log.error(
      {
        preset: subPreset.name,
        presetLevel: subPreset.subLevel,
        newLevel,
        nativeLevel: opts.user.sub?.level,
        patronLevel: opts.user.patreon?.sub?.level,
      },
      `Subscription insufficient`
    )
    yield { error: 'Your account is ineligible for this model - Subscription tier insufficient' }
    return
  }

  if (!subPreset.allowGuestUsage && opts.guest) {
    yield { error: 'Please sign in to use this model' }
    return
  }

  const srv = await getServerConfiguration()

  /**
   * Lock per user per model
   */
  const lockId = `${opts.user._id}-${opts.subscription.preset.name}`
  if (!opts.guidance && +srv.lockSeconds > 0) {
    await obtainLock(lockId, srv.lockSeconds)
  }

  const useRecommended = !!opts.gen.registered?.agnaistic?.useRecommended
  if (useRecommended) {
    const {
      memoryChatEmbedLimit,
      memoryContextLimit,
      memoryDepth,
      memoryReverseWeight,
      memoryUserEmbedLimit,
      ultimeJailbreak,
      systemPrompt,
      stopSequences,
      maxTokens,
      gaslight,
      allowGuestUsage,
      imageSettings,
      temporary,
      useAdvancedPrompt,
      _id,
      kind,
      name,
      ...recommended
    } = subPreset
    Object.assign(opts.gen, recommended)
  }

  // Max tokens and max context limit are decided by the subscription preset
  // We've already set the max context length prior to calling this handler
  opts.gen.maxTokens = Math.min(subPreset.maxTokens, opts.gen.maxTokens || 80)
  opts.gen.thirdPartyUrl = subPreset.thirdPartyUrl
  opts.gen.thirdPartyFormat = subPreset.thirdPartyFormat

  const stops =
    Array.isArray(subPreset.stopSequences) && opts.kind !== 'plain'
      ? new Set(subPreset.stopSequences)
      : new Set<string>()

  if (Array.isArray(opts.gen.stopSequences) && opts.gen.stopSequences.length) {
    for (const stop of opts.gen.stopSequences) {
      stops.add(stop)
    }
  }

  const allStops = Array.from(stops.values())

  const key =
    (subPreset.subApiKey ? decryptText(subPreset.subApiKey) : config.auth.inferenceKey) || ''
  if (subPreset.service && subPreset.service !== 'agnaistic') {
    let handler = handlers[subPreset.service]

    const userKey = subPreset.subApiKey

    opts.user.oaiKey = userKey
    opts.gen.thirdPartyModel = subPreset.thirdPartyModel
    opts.gen.oaiModel = subPreset.thirdPartyModel || subPreset.oaiModel

    opts.user.claudeApiKey = userKey
    opts.gen.claudeModel = subPreset.claudeModel

    opts.user.novelApiKey = userKey
    opts.gen.novelModel = subPreset.novelModel

    opts.user.scaleApiKey = userKey

    opts.gen.replicateModelType = subPreset.replicateModelType
    opts.gen.replicateModelVersion = subPreset.replicateModelVersion
    // opts.user.hordeKey = userKey

    if (!opts.user.adapterConfig) {
      opts.user.adapterConfig = {}
    }

    if (subPreset.service === 'kobold' && subPreset.thirdPartyFormat === 'llamacpp') {
      opts.gen.service = 'kobold'
      handler = handleThirdParty
    }

    if (subPreset.service === 'goose') {
      opts.user.adapterConfig.goose = {
        engine: subPreset.registered?.goose?.engine,
        apiKey: userKey,
      }
    }

    if (subPreset.service === 'mancer') {
      opts.user.adapterConfig.mancer = {
        ...subPreset.registered?.mancer,
        apiKey: userKey,
      }
    }

    if (subPreset.service === 'replicate') {
      opts.user.adapterConfig.replicate = {
        apiToken: userKey,
      }
    }

    if (subPreset.service === 'novel') {
      opts.user.novelApiKey = userKey
    }

    const stream = handler(opts)
    for await (const value of stream) {
      yield value
    }
    return
  }

  const body = getThirdPartyPayload(opts, allStops)
  body.api_key = key

  yield { prompt }

  log.debug({ ...body, prompt: null, imageData: null }, 'Agnaistic payload')

  log.debug(`Prompt:\n${prompt}`)

  const [submodel, override = ''] = subPreset.subModel.split(',')

  let params = [
    `type=text`,
    `id=${opts.user._id}`,
    `model=${submodel}`,
    `level=${level}`,
    `sub_model=${override}`,
  ]
    .filter((p) => !!p)
    .join('&')

  body.model_override = override

  const resp = gen.streamResponse
    ? await websocketStream({
        url: `${subPreset.subServiceUrl || subPreset.thirdPartyUrl}/api/v1/stream?${params}`,
        body,
      })
    : getTextgenCompletion(
        'Agnastic',
        `${subPreset.subServiceUrl || subPreset.thirdPartyUrl}/api/v1/generate?${params}`,
        body,
        {}
      )

  let accumulated = ''
  let result = ''

  while (true) {
    let generated = await resp.next()

    // Both the streaming and non-streaming generators return a full completion and yield errors.
    if (generated.done) {
      break
    }

    if (generated.value.meta) {
      const meta = generated.value.meta
      yield { meta }
      if (meta.host && !opts.guest) {
        sendOne(opts.user._id, { type: 'message-meta', host: meta.host })
      }
    }

    if (generated.value.error) {
      opts.log.error({ err: generated.value.error }, 'Agnaistic request failed')
      yield generated.value
      await releaseLock(lockId)
      return
    }

    // Only the streaming generator yields individual tokens.
    if (generated.value.token) {
      if (opts.guidance) accumulated = generated.value.token
      else accumulated += generated.value.token
      yield { partial: sanitiseAndTrim(accumulated, prompt, char, opts.characters, members) }
    }

    if (typeof generated.value === 'string') {
      result = generated.value
      break
    }
  }

  if (+srv.lockSeconds > 0) {
    await releaseLock(lockId)
  }

  const parsed = sanitise((result || accumulated).replace(prompt, ''))
  const trimmed = trimResponseV2(
    parsed,
    opts.replyAs,
    members,
    opts.characters,
    Array.from(stops.values())
  )
  yield trimmed || parsed
}

const settings: AdapterSetting[] = [
  {
    preset: true,
    field: 'subscriptionId',
    secret: false,
    label: 'Level',
    setting: { type: 'list', options: [] },
  },
]

registerAdapter('agnaistic', handleAgnaistic, {
  label: 'Agnaistic',
  options: [
    'repetitionPenalty',
    'repetitionPenaltyRange',
    'repetitionPenaltySlope',
    'topA',
    'topK',
    'topP',
    'streamResponse',
    'frequencyPenalty',
    'presencePenalty',
    'mirostatLR',
    'mirostatTau',
    'typicalP',
    'tailFreeSampling',
  ],
  settings,
  load: (user) => {
    return [
      {
        preset: true,
        field: 'useRecommended',
        secret: false,
        label: 'Use Recommended Settings',
        helperText: 'Use the settings provided by the subscription',
        setting: { type: 'boolean' },
        advanced: false,
      },
    ]
  },
})

setInterval(updateRegisteredSubs, 3000)

export async function updateRegisteredSubs() {
  const subs = getCachedSubscriptions()
  for (const item of settings) {
    if (item.setting.type === 'list' && item.field === 'subscriptionId') {
      const options = subs.map((sub) => ({ label: sub.name, value: sub._id }))
      item.setting.options = options
    }
  }
}

/**
 * These need to be here because the Agnaistic service can invoke any other service
 * Placing these in a 'common' module would cause a circular dependency graph between `generate.ts` and this module.
 */

export const handlers: { [key in AIAdapter]: ModelAdapter } = {
  novel: handleNovel,
  kobold: handleThirdParty,
  ooba: handleThirdParty,
  horde: handleHorde,
  openai: handleOAI,
  scale: handleScale,
  claude: handleClaude,
  goose: handleGooseAI,
  replicate: handleReplicate,
  openrouter: handleOpenRouter,
  mancer: handleMancer,
  petals: handlePetals,
  agnaistic: handleAgnaistic,
  venus: handleVenus,
}

export function getHandlers(settings: Partial<AppSchema.GenSettings>) {
  switch (settings.service!) {
    case 'agnaistic':
    case 'claude':
    case 'goose':
    case 'replicate':
    case 'horde':
    case 'ooba':
    case 'openrouter':
    case 'openai':
    case 'scale':
    case 'petals':
    case 'mancer':
    case 'novel':
    case 'venus':
      return handlers[settings.service]
  }

  switch (settings.thirdPartyFormat!) {
    case 'claude':
    case 'kobold':
    case 'openai':
      return handlers[settings.thirdPartyFormat!]

    case 'openai-chat':
    case 'openai-chatv2':
      return handlers.openai

    case 'featherless':
    case 'arli':
      return handlers.kobold

    case 'gemini':
      return handleGemini
  }

  return handleThirdParty
}
