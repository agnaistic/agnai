import { StatusError, errors, wrap } from '../wrap'
import { sendGuest, sendMany, sendOne } from '../ws'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import { assertValid } from '/common/valid'
import { createInferenceStream, inferenceAsync } from '/srv/adapter/generate'
import { store } from '/srv/db'
import { AppSchema } from '/common/types'
import { rerunGuidanceValues, runGuidance } from '/common/guidance/guidance-parser'
import { cyoaTemplate } from '/common/templates'

const validInference = {
  prompt: 'string',
  settings: 'any?',
  user: 'any',
  service: 'string',
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

  const prompt = cyoaTemplate(body.service!, settings.service === 'openai' ? settings.oaiModel : '')

  const infer = async (text: string, tokens?: number) => {
    const inference = await inferenceAsync({
      user: body.user,
      service: body.service,
      log,
      prompt: text,
      guest: userId ? undefined : socketId,
      retries: 2,
      maxTokens: tokens,
    })

    return inference.generated
  }

  const { values } = await runGuidance(prompt, {
    infer,
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
  assertValid({ ...validInference, placeholders: 'any?' }, body)

  if (userId) {
    const user = await store.users.getUser(userId)
    if (!user) throw errors.Unauthorized
    body.user = user
  }

  const infer = async (text: string, tokens?: number) => {
    const inference = await inferenceAsync({
      user: body.user,
      log,
      maxTokens: tokens,
      prompt: text,
      service: body.service,
      guest: userId ? undefined : socketId,
    })

    return inference.generated
  }

  const result = await runGuidance(body.prompt, { infer, placeholders: body.placeholders })
  return result
})

export const rerunGuidance = wrap(async ({ userId, log, body, socketId }) => {
  assertValid(
    {
      ...validInference,
      placeholders: 'any?',
      maxTokens: 'number?',
      rerun: ['string'],
      previous: 'any?',
    },
    body
  )

  if (userId) {
    const user = await store.users.getUser(userId)
    if (!user) throw errors.Unauthorized
    body.user = user
  }

  const infer = async (text: string, tokens?: number) => {
    const inference = await inferenceAsync({
      user: body.user,
      maxTokens: tokens,
      log,
      prompt: text,
      service: body.service,
      guest: userId ? undefined : socketId,
    })

    return inference.generated
  }

  const result = await rerunGuidanceValues(body.prompt, body.rerun, {
    infer,
    placeholders: body.placeholders,
    previous: body.previous,
  })
  return result
})

export const inference = wrap(async ({ socketId, userId, body, log }, res) => {
  assertValid({ ...validInference, requestId: 'string' }, body)

  res.json({ success: true, generating: true, message: 'Generating response' })

  if (userId) {
    const user = await store.users.getUser(userId)
    if (!user) throw errors.Unauthorized
    body.user = user
  }

  const { stream } = await createInferenceStream({
    user: body.user,
    log,
    prompt: body.prompt,
    service: body.service,
    guest: userId ? undefined : socketId,
  })

  let generated = ''
  let error = false
  let meta = {}

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

    if ('error' in gen) {
      error = true
      const payload = {
        type: 'inference-complete',
        requestId: body.requestId,
        error: gen.error,
      }
      if (userId) sendOne(userId, payload)
      else sendGuest(socketId, payload)
      continue
    }
  }

  if (error) return

  const payload = {
    type: 'inference-complete',
    requestId: body.requestId,
    response: generated,
    meta,
  }
  if (userId) sendOne(userId, payload)
  else sendGuest(socketId, payload)
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
