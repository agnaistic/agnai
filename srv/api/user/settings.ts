import { assertValid } from '/common/valid'
import needle from 'needle'
import { NOVEL_BASEURL } from '../../adapter/novel'
import { store } from '../../db'
import { AppSchema } from '../../../common/types/schema'
import { encryptText } from '../../db/util'
import { findUser, HORDE_GUEST_KEY } from '../horde'
import { get } from '../request'
import { getAppConfig } from '../settings'
import { entityUpload, handleForm } from '../upload'
import { errors, handle, StatusError } from '../wrap'
import { sendAll, sendOne } from '../ws'
import { v4 } from 'uuid'
import { getRegisteredAdapters } from '/srv/adapter/register'
import { AIAdapter } from '/common/adapters'
import { config } from '/srv/config'
import { getUserSubscriptionTier, toArray } from '/common/util'
import { UI } from '/common/types'
import { getLanguageModels } from '/srv/adapter/replicate'
import { getUser, toSafeUser } from '/srv/db/user'
import { getCachedTiers } from '/srv/db/subscriptions'

export const getInitialLoad = handle(async ({ userId, query }) => {
  const replicate = await getLanguageModels()
  if (config.ui.maintenance) {
    const appConfig = await getAppConfig()
    return { config: appConfig, replicate }
  }

  const [profile, user, presets, books, scenarios] = await Promise.all([
    store.users.getProfile(userId!),
    getSafeUserConfig(userId!, query.seed as string),
    store.presets.getUserPresets(userId!),
    store.memory.getBooks(userId!),
    store.scenario.getScenarios(userId!),
  ])

  const appConfig = await getAppConfig(user)

  return { profile, user, presets, config: appConfig, books, scenarios, replicate }
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

export const revealApiKey = handle(async ({ userId }) => {
  const user = await getUser(userId!)
  if (!user?.apiKey) {
    throw new StatusError('No API key set - Please generate an API key first', 400)
  }

  return { apiKey: user.apiKey }
})

export const generateApiKey = handle(async ({ userId }) => {
  const user = await getUser(userId!)
  if (!user) throw errors.Unauthorized

  const key = `${userId}_${v4().replace(/-/g, '')}`
  await store.users.updateUser(userId, { apiKey: key })
  return { apiKey: key }
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

export const deleteMistralKey = handle(async ({ userId }) => {
  await store.users.updateUser(userId!, {
    mistralKey: '',
  })

  return { success: true }
})

export const deleteFeatherlessKey = handle(async ({ userId }) => {
  await store.users.updateUser(userId!, {
    featherlessApiKey: '',
  })

  return { success: true }
})

export const deleteArliKey = handle(async ({ userId }) => {
  await store.users.updateUser(userId!, {
    arliApiKey: '',
  })

  return { success: true }
})

export const deleteElevenLabsKey = handle(async ({ userId }) => {
  await store.users.updateUser(userId!, {
    elevenLabsApiKey: '',
  })

  return { success: true }
})

export const updateUI = handle(async ({ userId, body }) => {
  assertValid(UI.uiGuard, body, true)

  await store.users.updateUserUI(userId, body)

  sendOne(userId, { type: 'ui-update', ui: body })

  return { success: true }
})

const validConfig = {
  novelApiKey: 'string?',
  novelModel: 'string?',
  koboldUrl: 'string?',
  useLocalPipeline: 'boolean?',
  thirdPartyFormat: 'string?',
  thirdPartyPassword: 'string?',
  hordeUseTrusted: 'boolean?',
  oobaUrl: 'string?',
  hordeApiKey: 'string?',
  hordeKey: 'string?',
  hordeModel: 'any?',
  hordeModels: ['string?'],
  hordeWorkers: ['string?'],
  oaiKey: 'string?',
  mistralKey: 'string?',
  featherlessApiKey: 'string?',
  arliApiKey: 'string?',
  scaleUrl: 'string?',
  scaleApiKey: 'string?',
  claudeApiKey: 'string?',
  elevenLabsApiKey: 'string?',
  speechtotext: 'any?',
  texttospeech: 'any?',
  images: 'any?',
  defaultPreset: 'string?',
  chargenPreset: 'string?',
  adapterConfig: 'any?',
  disableLTM: 'boolean?',
} as const

/**
 * Just for updating keys at the moment
 */
export const updatePartialConfig = handle(async ({ userId, body }) => {
  assertValid(
    {
      novelApiKey: 'string?',
      thirdPartyPassword: 'string?',
      hordeKey: 'string?',
      oaiKey: 'string?',
      scaleApiKey: 'string?',
      claudeApiKey: 'string?',
      elevenLabsApiKey: 'string?',
      arliApiKey: 'string?',
      patreonToken: 'string?',
      announcement: 'string?',
      defaultPreset: 'string?',
      chargenPreset: 'string?',
      images: 'any?',
      disableLTM: 'boolean?',
      imageDefaults: 'any?',
    },
    body
  )

  const update: Partial<AppSchema.User> = {}

  if (body.defaultPreset) {
    const preset = await store.presets.getUserPreset(body.defaultPreset)
    if (!preset || preset.userId !== userId) {
      throw new StatusError(`Invalid preset`, 403)
    }
    update.defaultPreset = body.defaultPreset
  }

  if (body.imageDefaults) {
    update.imageDefaults = body.imageDefaults
  }

  if (body.disableLTM !== undefined) {
    update.disableLTM = body.disableLTM
  }

  if (body.chargenPreset) {
    const preset = await store.presets.getUserPreset(body.chargenPreset)
    if (!preset || preset.userId !== userId) {
      throw new StatusError(`Invalid preset`, 403)
    }
    update.chargenPreset = body.chargenPreset
  }

  if (body.announcement) {
    update.announcement = body.announcement
  }

  if (body.novelApiKey) {
    await verifyNovelKey(body.novelApiKey)
    update.novelVerified = true
    update.novelApiKey = encryptText(body.novelApiKey)
  }

  if (body.hordeKey) {
    const username = await verifyHordeKey(body.hordeKey)
    update.hordeName = username
    update.hordeKey = encryptText(body.hordeKey)
  }

  if (body.oaiKey) {
    update.oaiKey = encryptText(body.oaiKey)
  }

  if (body.scaleApiKey) {
    update.scaleApiKey = encryptText(body.scaleApiKey)
  }

  if (body.claudeApiKey) {
    update.claudeApiKey = encryptText(body.claudeApiKey)
  }

  if (body.elevenLabsApiKey) {
    update.elevenLabsApiKey = encryptText(body.elevenLabsApiKey)
  }

  if (body.thirdPartyPassword) {
    update.thirdPartyPassword = encryptText(body.thirdPartyPassword)
  }

  if (body.images) {
    update.images = body.images
  }

  await store.users.updateUser(userId, update)
  const next = await getSafeUserConfig(userId)
  return next
})

export const updateConfig = handle(async ({ userId, body }) => {
  assertValid(validConfig, body)

  const prevUser = await store.users.getUser(userId!)
  if (!prevUser) {
    throw errors.Forbidden
  }

  const update: Partial<AppSchema.User> = {
    hordeUseTrusted: body.hordeUseTrusted ?? false,
    defaultPreset: body.defaultPreset || '',
    useLocalPipeline: body.useLocalPipeline,
  }

  if (body.hordeWorkers) {
    update.hordeWorkers = toArray(body.hordeWorkers)
  }

  if (body.disableLTM !== undefined) {
    update.disableLTM = body.disableLTM
  }

  if (body.hordeKey || body.hordeApiKey) {
    const prevKey = prevUser.hordeKey
    const incomingKey = body.hordeKey || body.hordeApiKey!

    const isNewKey =
      body.hordeKey !== '' && body.hordeKey !== HORDE_GUEST_KEY && body.hordeKey !== prevKey

    if (isNewKey) {
      const user = await verifyHordeKey(incomingKey)
      update.hordeName = user
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

  update.oobaUrl = body.oobaUrl

  if (body.images) {
    update.images = body.images
  }

  if (body.speechtotext) {
    update.speechtotext = body.speechtotext
  }

  if (body.texttospeech) {
    update.texttospeech = body.texttospeech
  }

  if (body.hordeModels) {
    update.hordeModel = toArray(body.hordeModels)
  } else if (body.hordeModel) {
    update.hordeModel = toArray(body.hordeModel)
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

  if (body.mistralKey) {
    update.mistralKey = encryptText(body.mistralKey!)
  }

  if (body.featherlessApiKey) {
    update.featherlessApiKey = encryptText(body.featherlessApiKey)
  }

  if (body.arliApiKey) {
    update.arliApiKey = encryptText(body.arliApiKey)
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

  if (body.elevenLabsApiKey) {
    update.elevenLabsApiKey = encryptText(body.elevenLabsApiKey)
  }

  if (body.adapterConfig) {
    const adapters = getRegisteredAdapters()
    for (const service in body.adapterConfig) {
      const svc = service as AIAdapter
      const adapter = adapters.find((adp) => adp.name === service)
      if (!adapter) continue

      for (const opt of adapter.settings) {
        if (!opt.secret) continue
        const next = body.adapterConfig[svc][opt.field]
        const prev = prevUser.adapterConfig?.[svc]?.[opt.field]
        if (!next && prev) body.adapterConfig[svc][opt.field] = prev
        else if (next) body.adapterConfig[svc][opt.field] = encryptText(next)
      }
    }
    update.adapterConfig = body.adapterConfig
  }

  await store.users.updateUser(userId!, update)
  const user = await getSafeUserConfig(userId!)
  return user
})

export const removeProfileAvatar = handle(async (req) => {
  const profile = await store.users.updateProfile(req.userId, { avatar: null as any })
  return profile
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
  if (user.koboldUrl === incomingUrl) return incomingUrl

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

export async function verifyNovelKey(key: string) {
  const res = await needle('get', `${NOVEL_BASEURL}/user/data`, {
    headers: { Authorization: `Bearer ${key}` },
    json: true,
    response_timeout: 5000,
  })

  return res.statusCode && res.statusCode <= 400
}

async function verifyHordeKey(key: string) {
  const user = await findUser(key).catch(() => null)
  if (!user) {
    throw new StatusError('Cannot set Horde API Key: Could not validate API key', 400)
  }
  return user.result?.username
}

export async function getSafeUserConfig(userId: string, seed?: string) {
  const user = await store.users.getUser(userId!)
  if (!user) return

  const sub = getUserSubscriptionTier(user, getCachedTiers())
  const next = sub ? { type: sub?.type, level: sub?.level, tierId: sub.tier._id } : undefined
  await store.users.updateUser(userId, { sub: next })
  user.sub = next

  return toSafeUser(user, seed)
}
