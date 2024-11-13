import { Router } from 'express'
import { StatusError, handle } from './wrap'
import { presetValidator } from '/common/presets'
import { isAdmin } from './auth'
import { assertValid } from '/common/valid'
import { store } from '../db'
import { encryptText } from '../db/util'
import billing, { stripe } from './billing'
import { config } from '../config'
import { patreon } from './user/patreon'
import { sendAll } from './ws'
import { toSamplerOrder } from '/common/sampler-order'
import { v4 } from 'uuid'

const subSetting = {
  ...presetValidator,
  subLevel: 'number',
  subModel: 'string?',
  subApiKey: 'string?',
  tokenizer: 'string?',
  isDefaultSub: 'boolean?',
} as const

const get = handle(async () => {
  const subscriptions = await store.subs.getSubscriptions()

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

  const samplers = toSamplerOrder(body.service, body.order, body.disabledSamplers)

  const create = {
    ...body,
    subApiKey: body.subApiKey ? encryptText(body.subApiKey) : '',
    order: samplers?.order,
    disabledSamplers: samplers?.disabled,
    _id: v4(),
  }
  const preset = await store.subs.createSubscription(create)
  return preset
})

const update = handle(async ({ body, params }) => {
  assertValid(subSetting, body)
  const samplers = toSamplerOrder(body.service, body.order, body.disabledSamplers)
  const update = {
    ...body,
    subApiKey: body.subApiKey ? encryptText(body.subApiKey) : '',
    order: samplers?.order,
    disabledSamplers: samplers?.disabled,
  }

  const preset = await store.subs.updateSubscription(params.id, update)

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
  await store.subs.deleteSubscription(req.params.id)
  return { success: true }
})

const replaceSubPreset = handle(async ({ body, params }) => {
  const id = params.id
  assertValid({ replacementId: 'string' }, body)

  await store.subs.replaceSubscription(id, body.replacementId)

  sendAll({
    type: 'subscription-replaced',
    subscriptionId: id,
    replacementId: body.replacementId,
  })

  return { success: true }
})

const getTier = handle(async (req) => {
  const tier = await store.subs.getTier(req.params.id)
  return tier
})

const getTiers = handle(async () => {
  const tiers = await store.subs.getTiers()
  return { tiers }
})

const createTier = handle(async ({ body }) => {
  assertValid(
    {
      name: 'string',
      productId: 'string',
      priceId: 'string',
      cost: 'number',
      level: 'number',
      enabled: 'boolean',
      disableSlots: 'boolean',
      description: 'string',
      apiAccess: 'boolean',
      guidanceAccess: 'boolean',
      imagesAccess: 'boolean',
      patreon: 'any?',
    },
    body
  )

  const tier = await store.subs.createTier(body)
  return tier
})

const updateTier = handle(async ({ body, params }) => {
  assertValid(
    {
      name: 'string',
      productId: 'string',
      priceId: 'string',
      level: 'number',
      enabled: 'boolean',
      disableSlots: 'boolean',
      description: 'string',
      apiAccess: 'boolean',
      patreon: 'any?',
      guidanceAccess: 'boolean',
      imagesAccess: 'boolean',
    },
    body,
    true
  )
  const tier = await store.subs.updateTier(params.id, body)
  return tier
})

const getProducts = handle(async (req) => {
  if (!config.billing.private) return { products: [], prices: [] }

  const products = await stripe.products.list()
  const prices = await stripe.prices.list()

  if (config.patreon.access_token && config.patreon.campaign_id) {
    const tiers = await patreon.getCampaignTiers()
    return {
      products: products.data,
      prices: prices.data,
      tiers,
    }
  }

  return { products: products.data, prices: prices.data }
})

const router = Router()

router.get('/tiers', getTiers)
router.get('/tiers/:id', getTier)
router.use('/billing/subscribe', billing)

router.get('/subscriptions', isAdmin, get)
router.post('/subscriptions', isAdmin, create)
router.post('/subscriptions/:id/replace', isAdmin, replaceSubPreset)
router.post('/subscriptions/:id', isAdmin, update)
router.delete('/subscriptions/:id', isAdmin, remove)
router.post('/tiers', isAdmin, createTier)
router.post('/tiers/:id', isAdmin, updateTier)
router.get('/billing/products', isAdmin, getProducts)

export { router as default }
