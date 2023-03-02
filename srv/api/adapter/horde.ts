import needle from 'needle'
import { logger } from '../../logger'
import { sanitise, trimResponse } from '../chat/common'
import { getGenSettings } from './presets'
import { ModelAdapter } from './type'

const baseUrl = 'https://horde.koboldai.net/api/v2/generate'

const base = { n: 1 }
const defaultKey = '0000000000'
const defaultModel = 'PygmalionAI/pygmalion-6b'

export const handleHorde: ModelAdapter = async function* ({
  char,
  chat,
  members,
  message,
  sender,
  prompt,
  user,
}) {
  if (!user.horde || !user.horde.key || !user.horde.model) {
    yield { error: `Horde request failed: Not configured` }
    return
  }

  const settings = getGenSettings('basic', 'kobold')
  const body = {
    params: { ...base, ...settings },
    models: [user.horde?.model || defaultModel],
    prompt,
    workers: [],
  }

  const headers = { apikey: user.horde?.key || defaultKey }

  const init = await needle('post', `${baseUrl}/async`, body, {
    json: true,
    headers,
  }).catch((err) => ({ error: err }))

  if ('error' in init) {
    yield { error: `Horde request failed: ${init.error.message || init.error}` }
    return
  }

  if (init.statusCode && init.statusCode >= 400) {
    yield { error: `Horde request failed: ${init.statusMessage}` }
    logger.error({ error: init.body }, `Horde request failed`)
    return
  }

  if (init.body.message) {
    yield { error: `Horde request failed: ${init.body.message}` }
    return
  }

  const id = init.body.id
  const started = Date.now()
  await wait()

  let text = ''

  while (true) {
    const diff = Date.now() - started
    if (diff > 60000) {
      yield { error: `Horde request failed: Timed out` }
      return
    }
    const check = await needle('get', `${baseUrl}/check/${id}`, { json: true }).catch((error) => ({
      error,
    }))

    if ('error' in check) {
      yield { error: `Horde request failed: ${check.error}` }
      return
    }

    if (check.statusCode && check.statusCode >= 400) {
      logger.error({ error: check.body }, `Horde request failed`)
      yield { error: `Horde request failed: ${check.statusMessage}` }
    }

    if (!check.body.done) {
      await wait()
      continue
    }

    if (check.body.faulted) {
      logger.error({ error: check.body }, `Horde request failed: Job failure`)
      yield { error: `Horde request failed: Job failure` }
      continue
    }

    if (check.body.generations.length) {
      text = check.body.generations[0].text
      logger.debug({ generations: check.body.generations, text }, `Horde response`)
      break
    }
  }

  const sanitised = sanitise(text)
  const trimmed = trimResponse(sanitised, char, members, ['END_OF_DIALOG'])
  yield trimmed ? trimmed.response : sanitised
}

function wait() {
  return new Promise((resolve) => setTimeout(resolve, 2000))
}
