import { Router } from 'express'
import { StatusError, handle } from './wrap'
import { chatGenSettings } from '/common/presets'
import { isAdmin } from './auth'
import { assertValid } from '/common/valid'
import { store } from '../db'

const subSetting = {
  ...chatGenSettings,
  name: 'string',
  subLevel: 'number',
} as const

const get = handle(async () => {
  const subscriptions = await store.presets.getSubscriptions()
  return { subscriptions }
})

const create = handle(async ({ body }) => {
  assertValid(subSetting, body)
  const create = {
    ...body,
    order: body.order?.split(',').map((v) => +v),
    disabledSamplers: body.disabledSamplers?.split(',').map((v) => +v),
  }
  const preset = await store.presets.createSubscription(create)
  return preset
})

const update = handle(async (req) => {
  assertValid(subSetting, req.body)
  const update = {
    ...req.body,
    order: req.body.order?.split(',').map((v) => +v),
    disabledSamplers: req.body.disabledSamplers?.split(',').map((v) => +v),
  }
  const preset = await store.presets.updateSubscription(req.params.id, update)
  if (!preset) {
    throw new StatusError('Subscription not found', 404)
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
