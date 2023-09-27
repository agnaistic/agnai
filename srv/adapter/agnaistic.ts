import { sanitise, sanitiseAndTrim, trimResponseV2 } from '../api/chat/common'
import { config } from '../config'
import { store } from '../db'
import { getCachedSubscriptionPresets, getCachedSubscriptions } from '../db/subscriptions'
import { decryptText } from '../db/util'
import { handleClaude } from './claude'
import { handleGooseAI } from './goose'
import { handleHorde } from './horde'
import { handleKobold } from './kobold'
import { handleMancer } from './mancer'
import { handleNovel } from './novel'
import { getTextgenCompletion, handleOoba } from './ooba'
import { handleOAI } from './openai'
import { handleOpenRouter } from './openrouter'
import { handlePetals } from './petals'
import { getStoppingStrings } from './prompt'
import { registerAdapter } from './register'
import { handleReplicate } from './replicate'
import { handleScale } from './scale'
import { websocketStream } from './stream'
import { ModelAdapter } from './type'
import { AIAdapter, AdapterSetting } from '/common/adapters'
import { AppSchema } from '/common/types'

export const handleAgnaistic: ModelAdapter = async function* (opts) {
  const { char, members, prompt, log, gen } = opts
  const level = opts.user.sub?.level ?? -1

  const fallback = getDefaultSubscription()
  const subId = opts.gen.registered?.agnaistic?.subscriptionId
  let preset = subId ? await store.subs.getSubscription(subId) : getDefaultSubscription()

  if (opts.guest && preset?.allowGuestUsage === false) {
    yield { error: 'Please sign in to use this model' }
    return
  }

  if (!preset || preset.subDisabled) {
    // If the subscription they're using becomes unavailable, gracefully fallback to the default and let them know
    if (fallback && !fallback.subDisabled && fallback.subLevel <= level) {
      preset = fallback
      yield {
        warning:
          'Your configured Agnaistic model/tier is no longer available. Using a fallback. Please update your preset.',
      }
    } else {
      yield { error: 'Tier/model selected is invalid or disabled. Try another' }
      return
    }
  }

  const newLevel = await store.users.validateSubscription(opts.user)
  if (newLevel instanceof Error) {
    yield { error: newLevel.message }
    return
  }

  if (preset.subLevel > newLevel) {
    yield { error: 'Your account is ineligible for this model - sub tier insufficient' }
    return
  }

  // Max tokens and max context limit are decided by the subscription preset
  opts.gen.maxTokens = Math.min(preset.maxTokens, opts.gen.maxTokens || 80)
  opts.gen.maxContextLength = Math.min(preset.maxContextLength!, opts.gen.maxContextLength!)
  opts.gen.thirdPartyUrl = preset.thirdPartyUrl
  opts.gen.thirdPartyFormat = preset.thirdPartyFormat

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
        engine: preset.registered?.goose.engine,
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

  const body = {
    prompt,
    temperature: gen.temp,
    top_k: gen.topK,
    top_p: gen.topP,
    n_predict: gen.maxTokens,
    stop: getStoppingStrings(opts).concat(['###', 'USER:', 'ASSISTANT:']),
    stream: true,
    frequency_penality: gen.frequencyPenalty,
    presence_penalty: gen.presencePenalty,
    mirostat: gen.mirostatTau ? 2 : 0,
    mirostat_tau: gen.mirostatTau,
    mirostat_eta: gen.mirostatLR,
    seed: -1,
    typical_p: gen.typicalP,
    ignore_eos: gen.banEosToken,
    repeat_penalty: gen.repetitionPenalty,
    repeat_last_n: gen.repetitionPenaltyRange,
    tfs_z: gen.tailFreeSampling,
  }

  if (preset.stopSequences) {
    body.stop.push(...preset.stopSequences)
  }

  yield { prompt: body.prompt }

  log.debug({ ...body, prompt: null }, 'Agnaistic payload')

  if (opts.kind === 'continue') {
    body.prompt = body.prompt.split('\n').slice(0, -1).join('\n')
  }

  log.debug(`Prompt:\n${body.prompt}`)

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

    if (sub.isDefaultSub) {
      if (!match.isDefaultSub || sub.subLevel < match.subLevel) match = sub
      continue
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
