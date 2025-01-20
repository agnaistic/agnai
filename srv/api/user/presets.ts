import { assertValid } from '/common/valid'
import { defaultPresets, presetValidator } from '../../../common/presets'
import { store } from '../../db'
import { StatusError, handle } from '../wrap'
import { AIAdapter } from '../../../common/adapters'
import { AppSchema } from '/common/types'
import { toSamplerOrder } from '/common/sampler-order'

const createPreset = {
  ...presetValidator,
  chatId: 'string?',
} as const

export const getUserPresets = handle(async ({ userId }) => {
  const [presets, templates] = await Promise.all([
    store.presets.getUserPresets(userId!),
    store.presets.getUserTemplates(userId),
  ])
  return { presets, templates }
})

export const getUserPreset = handle(async ({ userId, params }) => {
  const preset = await store.presets.getUserPreset(params.id, userId)

  if (!preset || preset.userId !== userId) {
    throw new StatusError('Preset not found', 404)
  }

  return preset
})

export const getBasePresets = handle(async () => {
  return { presets: defaultPresets }
})

export const createUserPreset = handle(async ({ userId, body, authed }) => {
  assertValid(createPreset, body, true)
  const service = body.service as AIAdapter

  if (body.novelModelOverride) {
    body.novelModel = body.novelModelOverride
    delete body.novelModelOverride
  }

  if (body.chatId) {
    delete body.chatId
  }

  const samplers = toSamplerOrder(body.service, body.order, body.disabledSamplers)
  const preset = {
    ...body,
    service,
    userId,
    order: samplers?.order,
    disabledSamplers: samplers?.disabled,
  }

  const newPreset = await store.presets.createUserPreset(userId!, preset)
  if (body.chatId) {
    await store.chats.update(body.chatId, { genPreset: newPreset._id })
  }

  if (authed && !authed.defaultPreset) {
    await store.users.updateUser(userId, { defaultPreset: newPreset._id })
  }

  return newPreset
})

export const updateUserPreset = handle(async ({ params, body, userId }) => {
  assertValid(presetValidator, body, true)

  if (body.novelModelOverride) {
    body.novelModel = body.novelModelOverride
    delete body.novelModelOverride
  }

  const { order, disabledSamplers, ...rest } = body

  const update: Partial<AppSchema.UserGenPreset> = { ...rest }
  if (order) {
    const samplers = toSamplerOrder(body.service, order, disabledSamplers)
    if (samplers) {
      update.order = samplers.order
      update.disabledSamplers = samplers.disabled
    }
  }

  const preset = await store.presets.updateUserPreset(userId!, params.id, update)
  return preset
})

export const deleteUserPreset = handle(async ({ params }) => {
  await store.presets.deleteUserPreset(params.id)

  return { success: true }
})

export const createTemplate = handle(async ({ body, userId }) => {
  assertValid({ name: 'string', template: 'string', presetId: 'string?' }, body)
  const template = await store.presets.createTemplate(userId, {
    name: body.name || '',
    template: body.template,
  })

  if (body.presetId) {
    await store.presets.updateUserPreset(userId, body.presetId, { promptTemplateId: template._id })
  }

  return template
})

export const updateTemplate = handle(async ({ body, userId, params }) => {
  assertValid({ name: 'string', template: 'string', presetId: 'string?' }, body)
  await store.presets.updateTemplate(userId, params.id, {
    name: body.name,
    template: body.template,
  })

  if (body.presetId) {
    await store.presets.updateUserPreset(userId, body.presetId, { promptTemplateId: params.id })
  }

  const next = await store.presets.getTemplate(params.id)
  return next
})

export const deleteTemplate = handle(async ({ userId, params }) => {
  await store.presets.deleteTemplate(userId, params.id)
  return { success: true }
})

export const getPromptTemplates = handle(async ({ userId }) => {
  const templates = await store.presets.getUserTemplates(userId)
  return { templates }
})

export const deleteUserPresetKey = handle(async ({ userId, params }) => {
  const preset = await store.presets.deleteUserPresetKey(userId, params.id)
  if (!preset) {
    throw new StatusError('Preset not found', 404)
  }
  return preset
})
