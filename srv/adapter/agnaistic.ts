import { sanitise, sanitiseAndTrim, trimResponseV2 } from '../api/chat/common'
import { config } from '../config'
import { store } from '../db'
import { isConnected } from '../db/client'
import { getCachedSubscriptionPresets, getCachedSubscriptions } from '../db/subscriptions'
import { decryptText } from '../db/util'
import { handleClaude } from './claude'
import { handleGooseAI } from './goose'
import { handleHorde } from './horde'
import { handleKobold } from './kobold'
import { handleMancer } from './mancer'
import { handleNovel } from './novel'
import { getTextgenCompletion, getThirdPartyPayload, handleOoba } from './ooba'
import { handleOAI } from './openai'
import { handleOpenRouter } from './openrouter'
import { handlePetals } from './petals'
import { registerAdapter } from './register'
import { handleReplicate } from './replicate'
import { handleScale } from './scale'
import { websocketStream } from './stream'
import { ModelAdapter } from './type'
import { AIAdapter, AdapterSetting } from '/common/adapters'
import { AppSchema } from '/common/types'

export async function getSubscriptionPreset(
  user: AppSchema.User,
  guest: boolean,
  gen?: Partial<AppSchema.GenSettings>
) {
  if (!isConnected()) return
  if (!gen) return
  if (gen.service !== 'agnaistic') return

  const level = user.sub?.level ?? -1
  let error: string | undefined = undefined
  let warning: string | undefined = undefined

  const fallback = getDefaultSubscription()
  const subId = gen.registered?.agnaistic?.subscriptionId
  let preset = subId ? await store.subs.getSubscription(subId) : fallback

  if (guest && preset?.allowGuestUsage === false) {
    error = 'Please sign in to use this model.'
  }

  if (!preset || preset.subDisabled) {
    // If the subscription they're using becomes unavailable, gracefully fallback to the default and let them know
    if (fallback && !fallback.subDisabled && fallback.subLevel <= level) {
      preset = fallback
      warning =
        'Your configured Agnaistic model/tier is no longer available. Using a fallback. Please update your preset.'
    } else {
      error = 'Tier/model selected is invalid or disabled. Try another.'
    }
  }

  return { level, preset, error, warning }
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

  const level = opts.subscription.level ?? -1
  const preset = opts.subscription.preset

  const newLevel = await store.users.validateSubscription(opts.user)
  if (newLevel instanceof Error) {
    yield { error: newLevel.message }
    return
  }

  if (preset.subLevel > newLevel) {
    yield { error: 'Your account is ineligible for this model - sub tier insufficient' }
    return
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
      ...recommended
    } = preset
    Object.assign(opts.gen, recommended)
  }

  // Max tokens and max context limit are decided by the subscription preset
  // We've already set the max context length prior to calling this handler
  opts.gen.maxTokens = Math.min(preset.maxTokens, opts.gen.maxTokens || 80)
  opts.gen.thirdPartyUrl = preset.thirdPartyUrl
  opts.gen.thirdPartyFormat = preset.thirdPartyFormat

  const stops = Array.isArray(preset.stopSequences)
    ? new Set(preset.stopSequences)
    : new Set<string>()

  if (Array.isArray(opts.gen.stopSequences) && opts.gen.stopSequences.length) {
    for (const stop of opts.gen.stopSequences) {
      stops.add(stop)
    }
  }

  const allStops = Array.from(stops.values())

  const key = (preset.subApiKey ? decryptText(preset.subApiKey) : config.auth.inferenceKey) || ''
  if (preset.service && preset.service !== 'agnaistic') {
    let handler = handlers[preset.service]

    const userKey = preset.subApiKey

    opts.user.oaiKey = userKey
    opts.gen.oaiModel = preset.oaiModel

    opts.user.claudeApiKey = userKey
    opts.gen.claudeModel = preset.claudeModel

    opts.user.novelApiKey = userKey
    opts.gen.novelModel = preset.novelModel

    opts.user.scaleApiKey = userKey

    opts.gen.replicateModelType = preset.replicateModelType
    opts.gen.replicateModelVersion = preset.replicateModelVersion
    // opts.user.hordeKey = userKey

    if (!opts.user.adapterConfig) {
      opts.user.adapterConfig = {}
    }

    if (preset.service === 'kobold' && preset.thirdPartyFormat === 'llamacpp') {
      opts.gen.service = 'kobold'
      handler = handleOoba
    }

    if (preset.service === 'goose') {
      opts.user.adapterConfig.goose = {
        engine: preset.registered?.goose?.engine,
        apiKey: userKey,
      }
    }

    if (preset.service === 'mancer') {
      opts.user.adapterConfig.mancer = {
        ...preset.registered?.mancer,
        apiKey: userKey,
      }
    }

    if (preset.service === 'replicate') {
      opts.user.adapterConfig.replicate = {
        apiToken: userKey,
      }
    }

    const stream = handler(opts)
    for await (const value of stream) {
      yield value
    }
    return
  }

  const body = getThirdPartyPayload(opts, allStops)

  yield { prompt }

  log.debug({ ...body, prompt: null }, 'Agnaistic payload')

  // if (opts.kind === 'continue') {
  //   body.prompt = body.prompt.split('\n').slice(0, -1).join('\n')
  // }

  log.debug(`Prompt:\n${prompt}`)

  const params = [
    `key=${key}`,
    `id=${opts.user._id}`,
    `model=${preset.subModel}`,
    `level=${level}`,
  ].join('&')

  const resp = gen.streamResponse
    ? await websocketStream({
        url: `${preset.subServiceUrl || preset.thirdPartyUrl}/api/v1/stream?${params}`,
        body,
      })
    : getTextgenCompletion(
        'Agnastic',
        `${preset.subServiceUrl || preset.thirdPartyUrl}/api/v1/generate?${params}`,
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
      yield { meta: generated.value.meta }
    }

    if (generated.value.error) {
      opts.log.error({ err: generated.value.error }, 'Agnaistic request failed')
      yield generated.value
      return
    }

    // Only the streaming generator yields individual tokens.
    if (generated.value.token) {
      accumulated += generated.value.token
      yield { partial: sanitiseAndTrim(accumulated, prompt, char, opts.characters, members) }
    }

    if (typeof generated.value === 'string') {
      result = generated.value
      break
    }
  }

  const parsed = sanitise((result || accumulated).replace(prompt, ''))
  const trimmed = trimResponseV2(parsed, opts.replyAs, members, opts.characters, ['END_OF_DIALOG'])
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
    const subs = getCachedSubscriptions(user)
    const opts = subs.map((sub) => ({ label: sub.name, value: sub._id }))
    return [
      {
        preset: true,
        field: 'subscriptionId',
        secret: false,
        label: 'Tier/Model',
        setting: { type: 'list', options: opts },
      },
      {
        preset: true,
        field: 'useRecommended',
        secret: false,
        label: 'Use Recommended Settings',
        helperText: 'Use the settings provided by the subscription',
        setting: { type: 'boolean' },
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
 * Select the lowest subscription below 0. Prioritise default sub.
 */
function getDefaultSubscription() {
  let match: AppSchema.SubscriptionPreset | undefined

  for (const sub of getCachedSubscriptionPresets()) {
    if (sub.subLevel >= 0 || sub.subDisabled || sub.deletedAt) continue
    if (!match) {
      match = sub
      continue
    }

    if (match?.isDefaultSub && !sub.isDefaultSub) continue

    if (sub.isDefaultSub) {
      return sub
    }

    if (sub.subLevel < match.subLevel) {
      match = sub
    }
  }
  return match
}

/**
 * These need to be here because the Agnaistic service can invoke any other service
 * Placing these in a 'common' module would cause a circular dependency graph between `generate.ts` and this module.
 */

export const handlers: { [key in AIAdapter]: ModelAdapter } = {
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
  mancer: handleMancer,
  petals: handlePetals,
  agnaistic: handleAgnaistic,
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
      return handlers[settings.service]
  }

  switch (settings.thirdPartyFormat!) {
    case 'claude':
    case 'kobold':
    case 'openai':
      return handlers[settings.thirdPartyFormat!]
  }

  return handlers.ooba
}
