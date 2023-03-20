import needle from 'needle'
import { config } from '../config'
import { trimResponse, trimResponseV2 } from '../api/chat/common'
import { ModelAdapter } from './type'

export const handleChai: ModelAdapter = async function* ({ char, members, prompt, settings, log }) {
  if (!config.chai.url) {
    yield { error: 'Chai URL not set' }
    return
  }

  if (config.chai.uid === 'empty' || config.chai.key === 'empty') {
    yield { error: 'Chai is not configured' }
    return
  }

  const body = { ...settings, text: prompt }

  log.debug(body, 'Chai payload')

  const response = await needle('post', `${config.chai.url}/generate/gptj`, body, {
    json: true,
    timeout: 3000,
    response_timeout: 10000,
    headers: {
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      origin: 'https://chai.ml',
      developer_uid: config.chai.uid,
      developer_key: config.chai.key,
    },
  }).catch((err) => ({ err }))

  if ('err' in response) {
    yield { error: response.err.message }
    return
  }

  const status = response.statusCode || 0
  if (status >= 500) {
    log.error(response.body, 'Chai request failed')
    yield { error: `Chai internal server error: ` }
    return
  }

  if (status >= 400) {
    log.error(response.body, 'Chai request failed')
    yield { error: 'Chai request error' }
    return
  }

  const username = 'You'
  const endTokens = [
    `Me:`,
    `Me :`,
    `${username}:`,
    `${char.name}:`,
    `${username} :`,
    `${char.name} :`,
    'END_OF_DIALOG',
  ]

  const trimmed = trimResponseV2(response.body.data, char, members, endTokens)
  yield trimmed || response.body.data
}
