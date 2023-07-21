import { assertValid } from '/common/valid'
import { getOpenAIUsage } from '../../adapter/openai'
import { store } from '../../db'
import { errors, handle, StatusError } from '../wrap'
import { findUser } from '../horde'
import { decryptText, encryptText } from '/srv/db/util'
import { getLanguageModels } from '/srv/adapter/replicate'
import { AIAdapter } from '/common/adapters'
import { getRegisteredAdapters } from '/srv/adapter/register'
import { getSafeUserConfig, verifyNovelKey } from './settings'
import { getOpenRouterModels } from '/srv/adapter/openrouter'
import needle from 'needle'

export const novelLogin = handle(async ({ userId, body }) => {
  assertValid({ key: 'string' }, body)

  const res = await needle(
    'post',
    'https://api.novelai.net/user/login',
    { key: body.key },
    {
      json: true,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }
  )

  if (res.statusCode && res.statusCode >= 400) {
    throw new StatusError(`Failed to authenticate with NovelAI: ${res.statusMessage}`, 400)
  }

  await verifyNovelKey(res.body.accessToken)

  if (userId) {
    await store.users.updateUser(userId, {
      novelApiKey: encryptText(res.body.accessToken),
      novelVerified: true,
    })
  }

  if (userId) {
    const user = await getSafeUserConfig(userId)
    return user
  }

  // Guest users
  return { novelVerified: true, novelApiKey: res.body.accessToken }
})

export const openaiUsage = handle(async ({ userId, body }) => {
  const guest = !userId

  if (guest) {
    assertValid({ key: 'string' }, body)
    const usage = await getOpenAIUsage(body.key, true)
    return usage
  }

  const user = await store.users.getUser(userId)
  if (!user?.oaiKey) {
    throw new StatusError('OpenAI key not set', 400)
  }

  const usage = await getOpenAIUsage(user.oaiKey, false)
  return usage
})

export const hordeStats = handle(async ({ userId, body }) => {
  if (!userId) {
    assertValid({ key: 'string' }, body)
    const user = await findUser(body.key)

    return {
      user: user.result,
      error: user.error?.message,
    }
  }

  const cfg = await store.users.getUser(userId)
  if (!cfg?.hordeKey) {
    throw new StatusError('Horde key not set', 400)
  }

  const user = await findUser(decryptText(cfg.hordeKey))
  return {
    user: user.result,
    error: user.error?.message,
  }
})

export const openRouterModels = handle(async () => {
  const models = await getOpenRouterModels()
  return { models }
})

export const replicateModels = handle(async ({ userId, body }) => {
  const models = await getLanguageModels()
  return models
})

export const updateService = handle(async ({ userId, body, params }) => {
  const service = params.service as AIAdapter
  const user = await store.users.getUser(userId)

  const adapter = getRegisteredAdapters().find((adp) => adp.name === service)
  if (!adapter) {
    throw new StatusError(`Service (${service}) does not exist or is not enabled`, 400)
  }

  if (!user) {
    throw errors.Forbidden
  }

  const prev = user.adapterConfig?.[service] || {}
  const next: any = {}

  /**
   * We only set known fields on registered adapters
   */
  for (const setting of adapter.settings) {
    if (setting.field in body) {
      const value = body[setting.field]
      if (setting.secret) {
        const secret = value === '' ? value : encryptText(value)
        next[setting.field] = secret
        continue
      }
      next[setting.field] = value
    }
  }

  await store.users.updateUser(userId, {
    adapterConfig: {
      ...user.adapterConfig,
      [service]: { ...prev, ...next },
    },
  })

  const safeUser = await getSafeUserConfig(userId)
  return safeUser
})
