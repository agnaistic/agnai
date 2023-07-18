import { StatusError, errors, wrap } from '../wrap'
import { sendGuest, sendOne } from '../ws'
import { defaultPresets, isDefaultPreset } from '/common/presets'
import { assertValid } from '/common/valid'
import { createInferenceStream, inferenceAsync } from '/srv/adapter/generate'
import { store } from '/srv/db'
import { AppSchema } from '/common/types'
import { runGuidance } from '/common/guidance/parser'

export const guidance = wrap(async ({ userId, log, body, socketId }) => {
  assertValid({ requestId: 'string', prompt: 'string', settings: 'any', user: 'any' }, body)

  let settings = body.settings as Partial<AppSchema.GenSettings> | null
  if (userId) {
    const id = body.settings._id as string
    settings = !id ? body.settings : isDefaultPreset(id) ? defaultPresets[id] : await store.presets.getUserPreset(id)
    body.user = await store.users.getUser(userId)
  }

  if (!settings) {
    throw new StatusError('The preset used does not have a service configured. Configure it from the presets page', 400)
  }

  if (!body.user) {
    throw errors.Unauthorized
  }

  const infer = async (text: string) => {
    const inference = await inferenceAsync({
      user: body.user,
      settings: settings!,
      log,
      prompt: text,
      guest: userId ? undefined : socketId,
    })

    return inference.generated
  }

  const result = await runGuidance(body.prompt, infer)
  return result
})

export const inference = wrap(async ({ socketId, userId, body, log }, res) => {
  assertValid({ requestId: 'string', prompt: 'string', settings: 'any', user: 'any' }, body)

  let settings = body.settings as Partial<AppSchema.GenSettings> | null
  if (userId) {
    const id = body.settings._id as string
    settings = !id ? body.settings : isDefaultPreset(id) ? defaultPresets[id] : await store.presets.getUserPreset(id)
    body.user = await store.users.getUser(userId)
  }

  if (!settings) {
    throw new StatusError('The preset used does not have a service configured. Configure it from the presets page', 400)
  }

  if (!body.user) {
    throw errors.Unauthorized
  }

  res.json({ success: true, generating: true, message: 'Generating response' })

  const { stream } = await createInferenceStream({
    user: body.user,
    settings,
    log,
    prompt: body.prompt,
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
