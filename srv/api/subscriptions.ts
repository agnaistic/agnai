import { Router } from 'express'
import { StatusError, handle } from './wrap'
import { presetValidator } from '/common/presets'
import { isAdmin } from './auth'
import { assertValid } from '/common/valid'
import { store } from '../db'
import { encryptText } from '../db/util'

const subSetting = {
  ...presetValidator,
  subLevel: 'number',
  subModel: 'string?',
  subApiKey: 'string?',
  isDefaultSub: 'boolean?',
} as const

const get = handle(async () => {
  const subscriptions = await store.presets.getSubscriptions()

  for (const sub of subscriptions) {
    if (sub.subApiKey) {
      sub.subApiKeySet = true
      sub.subApiKey = ''
    }
  }

  return { subscriptions }
})

const create = handle(async ({ body }) => {
  assertValid(subSetting, body)
  const create = {
    ...body,
    subApiKey: body.subApiKey ? encryptText(body.subApiKey) : '',
    order: body.order?.split(',').map((v) => +v),
    disabledSamplers: body.disabledSamplers?.split(',').map((v) => +v),
  }
  const preset = await store.presets.createSubscription(create)
  return preset
})

const update = handle(async ({ body, params }) => {
  assertValid(subSetting, body)
  const update = {
    ...body,
    subApiKey: body.subApiKey ? encryptText(body.subApiKey) : '',
    order: body.order?.split(',').map((v) => +v),
    disabledSamplers: body.disabledSamplers?.split(',').map((v) => +v),
  }

  const preset = await store.presets.updateSubscription(params.id, update)

  if (!preset) {
    throw new StatusError('Subscription not found', 404)
  }

  if (preset.subApiKey) {
    preset.subApiKey = ''
    preset.subApiKeySet = true
  }

  return preset
})

const remove = handle(async (req) => {
  await store.presets.deleteSubscription(req.params.id)
  return { success: true }
})

const router = Router()

router.use(isAdmin)
router.get('/', get)
router.post('/', create)
router.post('/:id', update)
router.delete('/:id', remove)

export { router as default }
