import { Router } from 'express'
import { StatusError, handle } from './wrap'
import { presetValidator } from '/common/presets'
import { isAdmin, loggedIn } from './auth'
import { assertValid } from '/common/valid'
import { store } from '../db'
import { encryptText } from '../db/util'
import { stripe } from './billing'
import { v4 } from 'uuid'
import { config } from '../config'
import { billingCmd, domain } from '../domains'

const subSetting = {
  ...presetValidator,
  subLevel: 'number',
  subModel: 'string?',
  subApiKey: 'string?',
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
  const create = {
    ...body,
    subApiKey: body.subApiKey ? encryptText(body.subApiKey) : '',
    order: body.order?.split(',').map((v) => +v),
    disabledSamplers: body.disabledSamplers?.split(',').map((v) => +v),
  }
  const preset = await store.subs.createSubscription(create)
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
      description: 'string',
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
      description: 'string',
    },
    body
  )
  const tier = await store.subs.updateTier(params.id, body)
  return tier
})

const getProducts = handle(async (req) => {
  const products = await stripe.products.list()
  const prices = await stripe.prices.list()
  return { products: products.data, prices: prices.data }
})

const checkout = handle(async ({ body, userId }) => {
  assertValid({ tierId: 'string' }, body)

  const tier = await store.subs.getTier(body.tierId)
  if (!tier) {
    throw new StatusError('Invalid subscription tier', 400)
  }

  const requestId = v4()

  const session = await stripe.checkout.sessions.create({
    success_url: `${config.billing.domain}/checkout/success?session_id={CHECKOUT_SESSION_ID}&request_id=${requestId}`,
    cancel_url: `${config.billing.domain}/checkout/cancel?request_id=${requestId}`,
    mode: 'subscription',
    billing_address_collection: 'auto',
    line_items: [{ price: tier.priceId, quantity: 1 }],
  })

  await billingCmd.request(session.id, {
    priceId: tier.priceId,
    productId: tier.productId,
    tierId: body.tierId,
    sessionId: session.id,
    userId,
  })

  return { requestId, sessionUrl: session.url }
})

const finishCheckout = handle(async ({ body, userId }) => {
  assertValid({ sessionId: 'string', state: 'string' }, body)

  const session = await stripe.checkout.sessions.retrieve(body.sessionId)
  if (!session) {
    throw new StatusError(`Invalid checkout`, 400)
  }

  const agg = await domain.billing.getAggregate(body.sessionId)
  if (agg.state !== 'request') {
    throw new StatusError(`Invalid checkout status (${agg.state})`, 400)
  }

  if (body.state === 'success') {
    if (session.payment_status !== 'paid') {
      throw new StatusError(
        `Unable to update subscription: Payment status invalid (${session.payment_status})`,
        400
      )
    }

    const tier = await store.subs.getTier(agg.tierId)
    await billingCmd.success(body.sessionId, { userId, session, tier })
    const config = await store.users.updateUser(userId, {
      sub: {
        customerId: session.customer as string,
        lastRenewed: new Date().toISOString(),
        level: tier.level,
        tierId: agg.tierId,
        last: '',
      },
    })

    if (!config) {
      throw new StatusError(`Failed to update subscription - Please contact support`, 500)
    }

    return config.sub
  }

  if (body.state === 'cancel') {
    await billingCmd.cancel(body.sessionId, { userId })
  }
})

const router = Router()

router.get('/tiers', getTiers)
router.get('/tiers/:id', getTier)
router.post('/billing/checkout', loggedIn, checkout)
router.post('/billing/checkout/finish', loggedIn, finishCheckout)

router.use(isAdmin)
router.get('/subscriptions', get)
router.post('/subscriptions', create)
router.post('/subscriptions:id', update)
router.delete('/subscriptions:id', remove)
router.post('/tiers', createTier)
router.post('/tiers/:id', updateTier)
router.get('/billing/products', getProducts)

export { router as default }
