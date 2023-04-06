import { assertValid } from 'frisker'
import { getOpenAIUsage } from '../../adapter/openai'
import { store } from '../../db'
import { handle, StatusError } from '../wrap'

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
