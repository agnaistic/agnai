import { StatusError, errors, wrap } from '../wrap'
import { sendGuest, sendMany, sendOne } from '../ws'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import { assertValid } from '/common/valid'
import {
  InferenceRequest,
  createInferenceStream,
  guidanceAsync,
  inferenceAsync,
} from '/srv/adapter/generate'
import { store } from '/srv/db'
import { AppSchema } from '/common/types'
import { cyoaTemplate } from '/common/mode-templates'
import { AIAdapter } from '/common/adapters'
import { parseTemplate } from '/common/template-parser'
import { obtainLock, releaseLock } from './lock'
import { v4 } from 'uuid'

const validInference = {
  prompt: 'string',
  settings: 'any?',
  user: 'any',
  presetId: 'string?',
  jsonSchema: 'any?',
  imageData: 'string?',
} as const

const validInferenceApi = {
  model: 'string?',
  presetId: 'string?',
  max_tokens: 'number',
  stream: 'boolean?',
  prompt: 'string',
  presence_penalty: 'number?',
  frequency_penalty: 'number?',
  repetition_penalty: 'number?',
  temperature: 'number?',
  min_p: 'number?',
  typical_p: 'number?',
  top_p: 'number?',
  top_k: 'number?',
  top_a: 'number?',
  encoder_repetition_penalty: 'number?',
  repetition_penalty_range: 'number?',
  repetition_penalty_slope: 'number?',
  mirostat_mode: 'number?',
  mirostat_tau: 'number?',
  mirostat_eta: 'number?',
  ignore_eos: 'boolean?',
  stop: ['string'],
  cfg_scale: 'number?',
  cfg_oppose: 'string?',
  guidance: 'boolean?',
  reguidance: ['string?'],
  placeholders: 'any?',
  lists: 'any?',
  previous: 'any?',
  dynatemp: 'any?',
  dynatemp_range: 'number?',
  smoothing_factor: 'number?',
  smoothing_curve: 'number?',
  tfs: 'number?',
  ban_eos_token: 'boolean?',
  add_bos_token: 'boolean?',
  temperature_last: 'boolean?',
  json_schema: 'any?',
} as const

export const generateActions = wrap(async ({ userId, log, body, socketId, params }) => {
  body.prompt = ''
  assertValid(
    {
      service: 'string',
      settings: 'any?',
      user: 'any',
      lines: ['string'],
      impersonating: 'any?',
      profile: 'any',
      prompt: 'string?',
      char: 'any?',
      chat: 'any?',
      characters: 'any?',
    },
    body
  )

  const settings = await assertSettings(body, userId)

  const messageId = params.id
  const both = await store.chats.getMessageAndChat(messageId)
  if (!both || !both.chat || !both.msg) throw errors.NotFound
  if (userId && both.chat?.userId !== userId) {
    throw errors.Forbidden
  }

  if (userId) {
    const user = await store.users.getUser(userId)
    if (!user) throw errors.Unauthorized

    body.user = user
  }

  const prompt = cyoaTemplate(
    body.service! as AIAdapter,
    settings.service === 'openai' ? settings.thirdPartyModel || settings.oaiModel : ''
  )

  const { parsed } = await parseTemplate(prompt, {
    chat: both.chat || body.chat || ({} as any),
    char: body.char || {},
    lines: body.lines,
    impersonate: body.impersonating,
    sender: body.profile,
  })

  const { values } = await guidanceAsync({
    prompt: parsed,
    log,
    user: body.user,
    guidance: true,
    settings,
    placeholders: {
      history: body.lines.join('\n'),
      user: body.impersonating?.name || body.profile.handle,
    },
  })

  const actions: AppSchema.ChatAction[] = []
  actions.push({ emote: values.emote1, action: values.action1 })
  actions.push({ emote: values.emote2, action: values.action2 })
  actions.push({ emote: values.emote3, action: values.action3 })

  await store.msgs.editMessage(messageId, { actions })

  sendMany(both.chat?.memberIds.concat(userId), {
    type: 'message-edited',
    messageId,
    message: both.msg.msg,
    actions,
  })

  return { actions }
})

export const guidance = wrap(async ({ userId, log, body, socketId }) => {
  assertValid(
    {
      ...validInference,
      requestId: 'string?',
      service: 'string?',
      placeholders: 'any?',
      lists: 'any?',
      previous: 'any?',
      reguidance: ['string?'],
    },
    body
  )

  if (!body.service && !body.settings && !userId) {
    throw new StatusError('No preset provided', 400)
  }

  if (userId) {
    const user = await store.users.getUser(userId)
    if (!user) throw errors.Unauthorized

    body.user = user

    if (!body.settings) {
      if (body.presetId) {
        const preset = await store.presets.getUserPreset(body.presetId)
        if (!preset) {
          throw new StatusError(`Preset not found - ${body.presetId}`, 400)
        }

        body.settings = preset
      } else if (!body.service) {
        if (!user.defaultPreset) throw errors.BadRequest
        const preset = await store.presets.getUserPreset(user.defaultPreset)
        body.service = preset?.service!
        body.settings = preset
      }
    }
  }

  const props: InferenceRequest = {
    user: body.user,
    log,
    prompt: body.prompt,
    settings: body.settings,
    guest: userId ? undefined : socketId,
    guidance: true,
    placeholders: body.placeholders,
    previous: body.previous,
    lists: body.lists,
    reguidance: body.reguidance,
    requestId: body.requestId,
    jsonSchema: body.jsonSchema,
  }

  const result = await guidanceAsync(props)
  return result
})

export const inferenceModels = wrap(async (req) => {
  if (!req.fullUser?.defaultPreset) {
    throw new StatusError(`No default preset configured - Check your Agnai user settings`, 400)
  }

  const preset = await store.presets.getUserPreset(req.fullUser?.defaultPreset!)
  if (!preset) {
    throw new StatusError(`Default preset not found - Check your Agnai user settings`, 400)
  }

  return {
    object: 'list',
    data: [
      {
        id: `(${preset.service}) ${preset.name}`,
        object: 'model',
        created: Date.now(),
        owned_by: req.user?.userId,
        root: preset._id,
        parent: null,
        permission: [
          {
            id: `modelperm-${preset._id}`,
            object: 'permission',
            created: Date.now(),
            allow_create_engine: false,
            allow_sampling: true,
            allow_logprobs: false,
            allow_search_indices: false,
            allow_view: true,
            allow_fine_tuning: false,
            organization: '*',
            group: null,
            is_blocking: false,
          },
        ],
      },
    ],
  }
})

export const inferenceApi = wrap(async (req, res) => {
  const { body } = req
  assertValid(validInferenceApi, body, true)

  let presetId = req.fullUser?.defaultPreset
  if (!presetId) {
    throw new StatusError('Missing "model" or "presetId" parameter', 400)
  }

  const preset = await store.presets.getUserPreset(presetId)
  if (!preset) {
    throw new StatusError('Invalid preset ID', 400)
  }

  if (preset.userId !== req.userId) {
    throw new StatusError('Invalid preset ID', 400)
  }

  const settings: Partial<AppSchema.GenSettings> = {
    service: preset.service,
    streamResponse: body.stream,
    name: '',
    maxTokens: body.max_tokens,
    temp: body.temperature,
    minP: body.min_p,
    topP: body.top_p,
    topA: body.top_a,
    topK: body.top_k,
    typicalP: body.typical_p,
    presencePenalty: body.presence_penalty,
    frequencyPenalty: body.frequency_penalty,
    repetitionPenalty: body.repetition_penalty,
    repetitionPenaltyRange: body.repetition_penalty_range,
    repetitionPenaltySlope: body.repetition_penalty_slope,
    encoderRepitionPenalty: body.encoder_repetition_penalty,
    cfgScale: body.cfg_scale,
    cfgOppose: body.cfg_oppose,
    earlyStopping: !body.ignore_eos,
    mirostatTau: body.mirostat_tau,
    mirostatLR: body.mirostat_eta,
    registered: preset.registered,
    stopSequences: body.stop,
    smoothingCurve: body.smoothing_curve,
    smoothingFactor: body.smoothing_factor,
    tailFreeSampling: body.tfs,
    banEosToken: body.ban_eos_token,
    addBosToken: body.add_bos_token,
    tempLast: body.temperature_last,
  }

  if ('dynatemp' in body && !!body.dynatemp) {
    settings.dynatemp_range = body.dynatemp_range
  } else {
    settings.dynatemp_range = body.dynatemp_range
  }

  const request: InferenceRequest = {
    prompt: body.prompt,
    user: req.fullUser!,
    log: req.log,
    settings,
    placeholders: body.placeholders,
    previous: body.previous,
    lists: body.lists,
  }

  await obtainLock(req.userId, 20)
  if (!body.stream) {
    try {
      const result = await inferenceAsync(request)
      await releaseLock(req.userId)
      return {
        id: req.requestId,
        object: 'text_completion',
        created: Date.now(),
        model: '',
        choices: [
          {
            text: result.generated,
            finish_reason: 'stop',
          },
        ],
      }
    } catch (ex: any) {
      throw new StatusError(ex.message, 500)
    }
  }

  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const { stream } = await createInferenceStream(request)

  let partial = ''

  for await (const gen of stream) {
    if (typeof gen === 'string') {
      res.write('data: [DONE]')
      break
    }

    if ('partial' in gen) {
      const token = gen.partial.slice(partial.length)
      partial = gen.partial
      const tick = {
        id: req.requestId,
        object: 'text_completion',
        created: Date.now(),
        model: presetId,
        choices: [{ index: 0, text: token, finish_reason: null, logprobs: null }],
      }
      res.write(`data: ${JSON.stringify(tick)}\n\n`)
      continue
    }

    if ('error' in gen) {
      await releaseLock(req.userId)
      const tick = { error: { message: gen.error } }
      res.write(`data: ${JSON.stringify(tick)}`)
      break
    }
  }

  await releaseLock(req.userId)
  res.end()
})

export const inference = wrap(async ({ socketId, userId, body, log, get }, res) => {
  assertValid({ ...validInference, requestId: 'string' }, body)

  res.json({ success: true, generating: true, message: 'Generating response' })

  if (userId) {
    const user = await store.users.getUser(userId)
    if (!user) throw errors.Unauthorized
    body.user = user
  }

  const inference = await inferenceAsync({
    user: body.user,
    log,
    prompt: body.prompt,
    settings: body.settings,
    guest: userId ? undefined : socketId,
    jsonSchema: body.jsonSchema,
    imageData: body.imageData,
  })

  return { response: inference.generated, meta: inference.meta }
})

export const inferenceStream = wrap(async ({ socketId, userId, body, log }, res) => {
  assertValid({ ...validInference, requestId: 'string' }, body)

  if (userId) {
    const user = await store.users.getUser(userId)
    if (!user) throw errors.Unauthorized
    body.user = user
  }

  const { stream, service } = await createInferenceStream({
    user: body.user,
    log,
    prompt: body.prompt,
    settings: body.settings,
    guest: userId ? undefined : socketId,
    jsonSchema: body.jsonSchema,
    imageData: body.imageData,
  })

  const requestId = body.requestId || v4()
  res.json({ requestId, success: true, generating: true })
  let response = ''
  let partial = ''

  const send = userId ? sendOne : sendGuest
  const sendId = userId ? userId : socketId

  await obtainLock(sendId, 15)

  send(sendId, { type: 'inference-prompt', prompt: body.prompt })

  try {
    for await (const gen of stream) {
      if (typeof gen === 'string') {
        response = gen
        continue
      }

      if ('meta' in gen) {
        send(sendId, { type: 'inference-meta', meta: gen.meta, requestId })
      }

      if ('partial' in gen) {
        partial = gen.partial
        send(sendId, { type: 'inference-partial', partial, service, requestId })
        continue
      }

      if ('error' in gen) {
        send(sendId, { type: 'inference-error', partial, error: gen.error, requestId })
        continue
      }

      if ('warning' in gen) {
        send(sendId, { type: 'inference-warning', requestId, warning: gen.warning })
        continue
      }
    }
  } catch (ex: any) {
    if (ex instanceof StatusError) {
      send(sendId, {
        type: 'inference-error',
        partial,
        error: `[${ex.status}] ${ex.message}`,
        requestId,
      })
    } else {
      send(sendId, { type: 'inference-error', partial, error: `${ex.message || ex}`, requestId })
    }
  }

  await releaseLock(sendId)

  if (!response) return
  send(sendId, { type: 'inference', requestId, response: response })
})

async function assertSettings(body: any, userId: string) {
  assertValid(validInference, body)
  let settings = body.settings as Partial<AppSchema.GenSettings> | null
  if (userId) {
    const id = body.settings._id as string
    settings = !id
      ? body.settings
      : isDefaultPreset(id)
      ? defaultPresets[id]
      : await store.presets.getUserPreset(id)
    body.user = await store.users.getUser(userId)
  }

  if (!settings) {
    throw new StatusError(
      'The preset used does not have a service configured. Configure it from the presets page',
      400
    )
  }

  if (!body.user) {
    throw errors.Unauthorized
  }

  return settings
}
