import { Router } from 'express'
import { assertValid } from 'frisker'
import { MULTI_TENANT_ADAPTERS } from '../../common/adapters'
import { store } from '../db'
import { AppSchema } from '../db/schema'
import { loggedIn } from './auth'
import { errors, handle, StatusError } from './wrap'
import { handleUpload } from './upload'
import { publishAll } from './ws/handle'
import { findUser, HORDE_GUEST_KEY } from './horde'

const router = Router()

const getProfile = handle(async ({ userId }) => {
  const profile = await store.users.getProfile(userId!)
  return profile
})

const getConfig = handle(async ({ userId }) => {
  const user = await store.users.getUser(userId!)
  return user
})

const register = handle(async (req) => {
  assertValid({ handle: 'string', username: 'string', password: 'string' }, req.body)
  const { profile, token, user } = await store.users.createUser(req.body)
  req.log.info({ user: user.username, id: user._id }, 'User registered')
  return { profile, token, user }
})

const login = handle(async (req) => {
  assertValid({ username: 'string', password: 'string' }, req.body)
  const result = await store.users.authenticate(req.body.username, req.body.password)

  if (!result) {
    throw new StatusError('Unauthorized', 401)
  }

  return result
})

const changePassword = handle(async (req) => {
  assertValid({ password: 'string' }, req.body)
  await store.admin.changePassword({ username: req.user?.username!, password: req.body.password })
  return { success: true }
})

const updateConfig = handle(async ({ userId, body }) => {
  assertValid(
    {
      novelApiKey: 'string',
      novelModel: 'string',
      koboldUrl: 'string',
      hordeApiKey: 'string',
      hordeModel: 'string',
      defaultAdapter: MULTI_TENANT_ADAPTERS,
    },
    body
  )

  const prevUser = await store.users.getUser(userId!)
  if (!prevUser) {
    throw errors.Forbidden
  }

  const prevKey = prevUser.horde?.key

  let type: 'horde' | 'kobold' = 'horde'

  const isNewKey =
    body.hordeApiKey !== '' && body.hordeApiKey !== HORDE_GUEST_KEY && body.hordeApiKey !== prevKey

  if (isNewKey) {
    const user = await findUser(body.hordeApiKey).catch(() => null)
    if (!user) {
      throw new StatusError('Cannot set Horde API Key: Could not validate API key', 400)
    }

    type = user.type
  }

  const user = await store.users.updateUser(userId!, {
    defaultAdapter: body.defaultAdapter,
    koboldUrl: body.koboldUrl,
    novelApiKey: body.novelApiKey,
    novelModel: body.novelModel,
    horde: {
      key: body.hordeApiKey,
      model: body.hordeModel,
      type,
    },
  })

  return user
})

const updateProfile = handle(async (req) => {
  const form = await handleUpload(req, { handle: 'string' })
  const [file] = form.attachments

  const previous = await store.users.getProfile(req.userId!)
  if (!previous) {
    throw errors.Forbidden
  }

  const update: Partial<AppSchema.Profile> = { handle: form.handle }
  if (file) {
    update.avatar = file.filename
  }

  const profile = await store.users.updateProfile(req.userId!, update)

  if (previous.handle !== form.handle) {
    publishAll({ type: 'profile-handle-changed', userId: req.userId!, handle: form.handle })
  }
  return profile
})

router.get('/', loggedIn, getProfile)
router.get('/config', loggedIn, getConfig)
router.post('/register', register)
router.post('/password', loggedIn, changePassword)
router.post('/login', login)
router.post('/config', loggedIn, updateConfig)
router.post('/profile', loggedIn, updateProfile)

export default router
