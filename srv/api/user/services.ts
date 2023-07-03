import { assertValid } from '/common/valid'
import { getOpenAIUsage } from '../../adapter/openai'
import { store } from '../../db'
import { handle, StatusError } from '../wrap'
import { findUser } from '../horde'
import { decryptText } from '/srv/db/util'
import { getLanguageModels } from '/srv/adapter/replicate'

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

export const replicateModels = handle(async ({ userId, body }) => {
  const models = await getLanguageModels()
  return models
})
