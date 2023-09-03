import { sanitise, sanitiseAndTrim, trimResponseV2 } from '../api/chat/common'
import { StatusError } from '../api/wrap'
import { config } from '../config'
import { store } from '../db'
import { getCachedSubscriptions } from '../db/presets'
import { getTextgenCompletion, getTextgenPayload } from './ooba'
import { registerAdapter } from './register'
import { websocketStream } from './stream'
import { ModelAdapter } from './type'
import { AdapterSetting } from '/common/adapters'
import { AppSchema } from '/common/types'

export const handleAgnaistic: ModelAdapter = async function* (opts) {
  const { char, members, prompt, log, gen } = opts
  const level = opts.user.sub?.level ?? -1

  const preset = await store.presets.getSubscription(opts.gen.registered?.agnaistic?.subscriptionId)
  if (!preset) {
    yield { error: 'Invalid request - Subscription invalid' }
    return
  }

  if (preset.subLevel > level) {
    yield { error: 'Your account is ineligible for this model - sub tier insufficient' }
    return
  }

  const body = getTextgenPayload(opts, ['## ', 'Instruction:', 'Response:', 'USER:', 'ASSISTANT:'])

  yield { prompt: body.prompt }

  log.debug({ ...body, prompt: null }, 'Textgen payload')

  if (opts.kind === 'continue') {
    body.prompt = body.prompt.split('\n').slice(0, -1).join('\n')
  }

  log.debug(`Prompt:\n${body.prompt}`)
  await checkLimit(opts.user)

  const resp = gen.streamResponse
    ? await websocketStream({
        url: `${preset.thirdPartyUrl}/api/v1/stream?key=${config.auth.inferenceKey}&id=${opts.user._id}&model=${preset.subModel}`,
        body,
      })
    : getTextgenCompletion(
        'Agnastic',
        `${preset.thirdPartyUrl}/api/v1/generate?key=${config.auth.inferenceKey}&id=${opts.user._id}&model=${preset.subModel}`,
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

setInterval(updateRegisteredSubs, 5000)

export function updateRegisteredSubs() {
  const subs = getCachedSubscriptions()
  for (const item of settings) {
    if (item.setting.type === 'list' && item.field === 'subscriptionId') {
      const options = subs.map((sub) => ({ label: sub.name, value: sub._id }))
      item.setting.options = options
    }
  }
}

async function checkLimit(user: AppSchema.User) {
  const prev = new Date(user.sub?.last || 0)
  const diff = Date.now() - prev.valueOf()

  const level = user.sub?.level ?? 0

  if (level > 0) return

  /**
   * @todo Move rate limits to db
   */
  if (diff < config.limits.subRate * 1000) {
    throw new StatusError(`Rate limit exceed - Please try again`, 429)
  }

  await store.users.updateLimit(user._id)
}
