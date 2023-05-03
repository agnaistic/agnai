import { assertValid } from 'frisker'
import needle from 'needle'
import { NOVEL_BASEURL } from '../../adapter/novel'
import { store } from '../../db'
import { AppSchema } from '../../db/schema'
import { encryptText } from '../../db/util'
import { findUser, HORDE_GUEST_KEY } from '../horde'
import { get } from '../request'
import { getAppConfig } from '../settings'
import { entityUpload, handleForm } from '../upload'
import { errors, handle, StatusError } from '../wrap'
import { sendAll } from '../ws'
import { v4 } from 'uuid'

export const getInitialLoad = handle(async ({ userId }) => {
  const [profile, user, presets, config, books] = await Promise.all([
    store.users.getProfile(userId!),
    getSafeUserConfig(userId!),
    store.presets.getUserPresets(userId!),
    getAppConfig(),
    store.memory.getBooks(userId!),
  ])

  return { profile, user, presets, config, books }
})

export const getProfile = handle(async ({ userId, params }) => {
  const id = params.id ? params.id : userId!
  const profile = await store.users.getProfile(id!)
  return profile
})

export const getConfig = handle(async ({ userId }) => {
  const user = await getSafeUserConfig(userId!)
  return user
})

export const deleteScaleKey = handle(async ({ userId }) => {
  await store.users.updateUser(userId!, {
    scaleApiKey: '',
  })

  return { success: true }
})

export const deleteClaudeKey = handle(async ({ userId }) => {
  await store.users.updateUser(userId!, {
    claudeApiKey: '',
  })

  return { success: true }
})

export const deleteThirdPartyPassword = handle(async ({ userId }) => {
  await store.users.updateUser(userId!, {
    thirdPartyPassword: '',
  })

  return { success: true }
})

export const deleteHordeKey = handle(async ({ userId }) => {
  await store.users.updateUser(userId!, {
    hordeKey: '',
    hordeName: '',
  })

  return { success: true }
})

export const deleteNovelKey = handle(async ({ userId }) => {
  await store.users.updateUser(userId!, {
    novelApiKey: '',
    novelVerified: false,
  })

  return { success: true }
})

export const deleteOaiKey = handle(async ({ userId }) => {
  await store.users.updateUser(userId!, {
    oaiKey: '',
  })

  return { success: true }
})

export const updateConfig = handle(async ({ userId, body }) => {
  assertValid(
    {
      novelApiKey: 'string?',
      novelModel: 'string?',
      koboldUrl: 'string?',
      thirdPartyFormat: 'string?',
      thirdPartyPassword: 'string?',
      hordeUseTrusted: 'boolean?',
      oobaUrl: 'string?',
      hordeApiKey: 'string?',
      hordeKey: 'string?',
      hordeModel: 'string?',
      luminaiUrl: 'string?',
      hordeWorkers: ['string'],
      oaiKey: 'string?',
      scaleUrl: 'string?',
      scaleApiKey: 'string?',
      claudeApiKey: 'string?',
      images: 'any?',
      defaultPreset: 'string?',
    },
    body
  )

  const prevUser = await store.users.getUser(userId!)
  if (!prevUser) {
    throw errors.Forbidden
  }

  const update: Partial<AppSchema.User> = {
    hordeWorkers: body.hordeWorkers,
    hordeUseTrusted: body.hordeUseTrusted ?? false,
    defaultPreset: body.defaultPreset || '',
  }

  if (body.hordeKey || body.hordeApiKey) {
    const prevKey = prevUser.hordeKey
    const incomingKey = body.hordeKey || body.hordeApiKey!

    const isNewKey =
      body.hordeKey !== '' && body.hordeKey !== HORDE_GUEST_KEY && body.hordeKey !== prevKey

    if (isNewKey) {
      const user = await findUser(incomingKey).catch(() => null)
      if (!user) {
        throw new StatusError('Cannot set Horde API Key: Could not validate API key', 400)
      }
      update.hordeName = user.result?.username
    }

    update.hordeKey = encryptText(incomingKey)
  }

  const validatedThirdPartyUrl =
    body.thirdPartyFormat === 'kobold'
      ? await verifyKobldUrl(prevUser, body.koboldUrl)
      : body.koboldUrl

  if (validatedThirdPartyUrl) {
    update.koboldUrl = validatedThirdPartyUrl
  } else {
    update.koboldUrl = ''
  }

  if (body.thirdPartyFormat) {
    update.thirdPartyFormat = body.thirdPartyFormat as typeof update.thirdPartyFormat
  }

  const validOobaUrl = await verifyOobaUrl(prevUser, body.oobaUrl)
  if (validOobaUrl !== undefined) update.oobaUrl = validOobaUrl
  if (body.luminaiUrl !== undefined) update.luminaiUrl = body.luminaiUrl

  if (body.images) {
    update.images = body.images
  }

  if (body.hordeModel) {
    update.hordeModel = body.hordeModel!
  }

  if (body.novelModel) {
    update.novelModel = body.novelModel
  }

  if (body.novelApiKey) {
    const verified = await verifyNovelKey(body.novelApiKey)

    if (!verified) {
      throw new StatusError(`Cannot set Novel API key: Provided key failed to validate`, 400)
    }

    update.novelVerified = true
    update.novelApiKey = encryptText(body.novelApiKey!)
  }

  if (body.oaiKey) {
    update.oaiKey = encryptText(body.oaiKey!)
  }

  if (body.scaleUrl !== undefined) update.scaleUrl = body.scaleUrl
  if (body.scaleApiKey) {
    update.scaleApiKey = encryptText(body.scaleApiKey)
  }

  if (body.claudeApiKey) {
    update.claudeApiKey = encryptText(body.claudeApiKey)
  }

  if (body.thirdPartyPassword) {
    update.thirdPartyPassword = encryptText(body.thirdPartyPassword)
  }

  await store.users.updateUser(userId!, update)
  const user = await getSafeUserConfig(userId!)
  return user
})

export const updateProfile = handle(async (req) => {
  const form = handleForm(req, { handle: 'string' } as const)
  const filename = await entityUpload(
    'profile',
    v4(),
    form.attachments.find((a) => a.field === 'avatar')
  )

  const previous = await store.users.getProfile(req.userId!)
  if (!previous) {
    throw errors.Forbidden
  }

  const update: Partial<AppSchema.Profile> = {
    handle: form.handle,
  }

  if (filename) {
    update.avatar = filename
  }

  const profile = await store.users.updateProfile(req.userId!, update)

  if (previous.handle !== form.handle) {
    sendAll({ type: 'profile-handle-changed', userId: req.userId!, handle: form.handle })
  }

  return profile
})

async function verifyKobldUrl(user: AppSchema.User, incomingUrl?: string) {
  if (!incomingUrl) return incomingUrl
  if (user.koboldUrl === incomingUrl) return

  const url = incomingUrl.match(/(http(s{0,1})\:\/\/)([a-z0-9\.\-]+)(\:[0-9]+){0,1}/gm)
  if (!url || !url[0]) {
    throw new StatusError(
      `Kobold URL provided could not be verified: Invalid URL format. Use a fully qualified URL. E.g.: https://local-tunnel-url-10-20-30-40.loca.lt`,
      400
    )
  }

  const res = await get({ host: url[0], url: '/api/v1/model' })
  if (res.error) {
    throw new StatusError(`Kobold URL could not be verified: ${res.error.message}`, 400)
  }

  return url[0]
}

async function verifyOobaUrl(user: AppSchema.User, incomingUrl?: string) {
  if (!incomingUrl) return incomingUrl
  if (user.oobaUrl === incomingUrl) return

  const url = incomingUrl.match(/(http(s{0,1})\:\/\/)([a-z0-9\.\-]+)(\:[0-9]+){0,1}/gm)

  if (!url || !url[0]) {
    throw new StatusError(
      `Ooba URL provided could not be verified: Invalid URL format. Use a fully qualified URL. E.g.: https://local-tunnel-url-10-20-30-40.loca.lt`,
      400
    )
  }

  return url[0]
}
async function verifyNovelKey(key: string) {
  const res = await needle('get', `${NOVEL_BASEURL}/user/data`, {
    headers: { Authorization: `Bearer ${key}` },
    json: true,
    response_timeout: 5000,
  })

  return res.statusCode && res.statusCode <= 400
}

async function getSafeUserConfig(userId: string) {
  const user = await store.users.getUser(userId!)
  if (user) {
    user.novelApiKey = ''
    user.hordeKey = ''

    if (user.oaiKey) {
      user.oaiKeySet = true
      user.oaiKey = ''
    }

    if (user.scaleApiKey) {
      user.scaleApiKeySet = true
      user.scaleApiKey = ''
    }

    if (user.claudeApiKey) {
      user.claudeApiKey = ''
      user.claudeApiKeySet = true
    }

    if (user.thirdPartyPassword) {
      user.thirdPartyPassword = ''
      user.thirdPartyPasswordSet = true
    }
  }
  return user
}
