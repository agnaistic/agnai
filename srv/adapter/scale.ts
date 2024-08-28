import needle from 'needle'
import { decryptText } from '../db/util'
import { sanitise, trimResponseV2 } from '/common/requests/util'
import { ModelAdapter } from './type'

export const handleScale: ModelAdapter = async function* ({
  char,
  members,
  user,
  prompt,
  guest,
  log,
  ...opts
}) {
  if (!user.scaleApiKey) {
    yield { error: 'Scale API key not set' }
    return
  }

  if (!user.scaleUrl) {
    yield { error: 'Scale URL not set' }
    return
  }

  const body = {
    input: { input: prompt },
  }

  log.debug(body, 'Scale payload')
  yield { prompt: prompt }
  const auth = `Basic ${guest ? user.scaleApiKey : decryptText(user.scaleApiKey)}`

  const response = await needle('post', user.scaleUrl, body, {
    json: true,
    open_timeout: 0,
    headers: {
      Authorization: auth,
    },
  }).catch((err) => ({ err }))

  if ('err' in response) {
    log.error({ err: `Scale request failed: ${response.err?.message || response.err}` })
    yield { error: `Scale request failed: ${response.err.message || response.err}` }
    return
  }

  const status = response.statusCode || 0
  if (status >= 400) {
    log.error({ error: response.body }, `Scale request failed (${status})`)
    yield { error: `Scale API returned an error: ${response.statusMessage!}` }
    return
  }

  if (response.body.error) {
    log.error({ error: response.body }, `Scale response failed (${status})`)
    yield { error: `Scale API returned an error: ${response.body.error}` }
    return
  }

  const parsed = sanitise(response.body.output)
  const trimmed = trimResponseV2(parsed, opts.replyAs, members, opts.characters, [])
  yield trimmed || parsed
}
