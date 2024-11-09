import { Router } from 'express'
import { assertValid } from '/common/valid'
import { store } from '../db'
import { isAdmin, loggedIn } from './auth'
import { StatusError, handle } from './wrap'
import { getLiveCounts, sendAll } from './ws/redis'
import { encryptText } from '../db/util'

const router = Router()

router.use(loggedIn, isAdmin)

const searchUsers = handle(async (req) => {
  const { body } = req
  assertValid(
    { username: 'string?', page: 'number?', customerId: 'string?', subscribed: 'boolean?' },
    body
  )
  const users = await store.admin.getUsers({
    username: body.username,
    customerId: body.customerId,
    subscribed: body.subscribed,
    page: body.page,
  })

  return { users: users.map((u) => ({ ...u, hash: undefined })) }
})

const impersonateUser = handle(async (req) => {
  const userId = req.params.userId
  const user = await store.users.getUser(userId)
  if (!user) {
    throw new StatusError('User not found', 404)
  }

  const token = await store.users.createAccessToken(user.username, user)
  return { token }
})

const setUserPassword = handle(async (req) => {
  assertValid({ userId: 'string', password: 'string' }, req.body)
  await store.admin.changePassword({ userId: req.body.userId, password: req.body.password })
  return { success: true }
})

const getUserInfo = handle(async ({ params }) => {
  const info = await store.admin.getUserInfo(params.id)
  return info
})

const notifyAll = handle(async ({ body }) => {
  assertValid({ message: 'string', level: 'number?' }, body)
  sendAll({ type: 'admin-notification', message: body.message, level: body.level })

  return { success: true }
})

const getMetrics = handle(async () => {
  const { entries: counts, maxLiveCount } = getLiveCounts()
  const metrics = await store.users.getMetrics()

  const connected = counts.map((count) => count.count).reduce((prev, curr) => prev + curr, 0)
  const versioned = counts.map((count) => count.versioned).reduce((prev, curr) => prev + curr, 0)
  const shas = counts.reduce((prev, curr) => {
    for (const [sha, count] of Object.entries(curr.shas)) {
      if (!prev[sha]) prev[sha] = 0
      prev[sha] += count
    }
    return prev
  }, {} as Record<string, number>)

  const threshold = Date.now() - 30000
  return {
    ...metrics,
    connected,
    versioned,
    maxLiveCount,
    shas,
    each: counts.filter((c) => c.date.valueOf() >= threshold),
  }
})

const updateConfiguration = handle(async ({ body }) => {
  assertValid(
    {
      slots: 'string',
      maintenance: 'boolean',
      maintenanceMessage: 'string',
      apiAccess: ['off', 'users', 'subscribers', 'admins'],
      policiesEnabled: 'boolean',
      termsOfService: 'string',
      privacyStatement: 'string',
      enabledAdapters: ['string'],
      imagesEnabled: 'boolean',
      imagesHost: 'string',
      ttsAccess: ['off', 'users', 'subscribers', 'admins'],
      ttsHost: 'string',
      ttsApiKey: 'string?',
      imagesModels: ['any'],
      supportEmail: 'string',
      googleClientId: 'string',
      stripeCustomerPortal: 'string',
    },
    body
  )

  const update = {
    kind: 'configuration' as const,
    privacyUpdated: '',
    tosUpdated: '',
    maxGuidanceTokens: 1000,
    maxGuidanceVariables: 15,
    ...body,
  }

  if (!update.ttsApiKey) {
    delete update.ttsApiKey
  } else {
    update.ttsApiKey = encryptText(update.ttsApiKey)
  }

  const next = await store.admin.updateServerConfiguration(update)

  return next
})

const updateTier = handle(async (req) => {
  assertValid({ tierId: 'string' }, req.body)
  await store.users.updateUserTier(req.params.userId, req.body.tierId)
  return { success: true }
})

router.post('/impersonate/:userId', impersonateUser)
router.post('/users', searchUsers)
router.post('/users/:userId/tier', updateTier)
router.get('/metrics', getMetrics)
router.get('/users/:id/info', getUserInfo)
router.post('/user/password', setUserPassword)
router.post('/notify', notifyAll)
router.post('/configuration', updateConfiguration)

export default router
