import { assertValid } from 'frisker'
import { config } from '../../config'
import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { encryptText } from '../../db/util'
import { findUser, HORDE_GUEST_KEY } from '../horde'
import { get } from '../request'
import { handleUpload } from '../upload'
import { errors, handle, StatusError } from '../wrap'
import { publishAll } from '../ws/handle'

export const getProfile = handle(async ({ userId }) => {
  const profile = await store.users.getProfile(userId!)
  return profile
})

export const getConfig = handle(async ({ userId }) => {
  const user = await store.users.getUser(userId!)
  if (user) {
    user.novelApiKey = ''
    user.hordeKey = ''
  }
  return user
})

export const updateConfig = handle(async ({ userId, body }) => {
  assertValid(
    {
      novelApiKey: 'string?',
      novelModel: 'string?',
      koboldUrl: 'string?',
      hordeApiKey: 'string?',
      hordeModel: 'string?',
      luminaiUrl: 'string?',
      defaultAdapter: config.adapters,
    },
    body
  )

  const prevUser = await store.users.getUser(userId!)
  if (!prevUser) {
    throw errors.Forbidden
  }

  const update: Partial<AppSchema.User> = {
    defaultAdapter: body.defaultAdapter,
  }

  if (body.hordeApiKey) {
    const prevKey = prevUser.hordeKey
    const isNewKey =
      body.hordeApiKey !== '' &&
      body.hordeApiKey !== HORDE_GUEST_KEY &&
      body.hordeApiKey !== prevKey

    if (isNewKey) {
      const user = await findUser(body.hordeApiKey).catch(() => null)
      if (!user) {
        throw new StatusError('Cannot set Horde API Key: Could not validate API key', 400)
      }
    }

    update.hordeKey = encryptText(body.hordeApiKey)
  }

  await verifyKobldUrl(prevUser, body.koboldUrl)

  if (body.koboldUrl !== undefined) update.koboldUrl = body.koboldUrl
  if (body.luminaiUrl !== undefined) update.luminaiUrl = body.luminaiUrl

  if (body.hordeModel) {
    update.hordeModel = body.hordeModel!
  }

  if (body.novelModel) {
    update.novelModel = body.novelModel
  }

  if (body.novelApiKey) {
    update.novelApiKey = encryptText(body.novelApiKey!)
  }

  const user = await store.users.updateUser(userId!, update)
  return user
})

export const updateProfile = handle(async (req) => {
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

async function verifyKobldUrl(user: AppSchema.User, incomingUrl?: string) {
  if (!incomingUrl) return
  if (user.koboldUrl === incomingUrl) return

  const res = await get({ host: incomingUrl, url: '/api/v1/model' })
  if (res.error) {
    throw new StatusError(`Kobold URL could not be verified: ${res.error.message}`, 400)
  }
}
