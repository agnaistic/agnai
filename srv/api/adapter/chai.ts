import needle from 'needle'
import { config } from '../../config'
import { logger } from '../../logger'
import { trimResponse } from '../chat/common'
import { createPrompt } from './prompt'
import { ModelAdapter } from './type'

const base = {
  repetition_penalty: 1.1,
  response_length: 64,
  tempature: 0.6,
  top_k: 40,
  top_p: 1,
}

export const handleChai: ModelAdapter = async function* ({
  chat,
  char,
  history,
  message,
  sender,
  members,
}) {
  if (!config.chai.url) {
    yield { error: 'Chai URL not set' }
    return
  }

  if (config.chai.uid === 'empty' || config.chai.key === 'empty') {
    yield { error: 'Chai is not configured' }
    return
  }

  const body = {
    ...base,
    text: createPrompt({ sender, chat, char, history, message }),
  }

  const response = await needle('post', `${config.chai.url}/generate/gptj`, body, {
    json: true,
    headers: {
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      origin: 'https://chai.ml',
      developer_uid: config.chai.uid,
      developer_key: config.chai.key,
    },
  })
  logger.warn(response.body, 'Chai response')

  const status = response.statusCode || 0
  if (status >= 500) {
    yield { error: 'Chai internal server error' }
    return
  }

  if (status >= 400) {
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

  const trimmed = trimResponse(response.body.data, char, members, endTokens)
  yield trimmed ? trimmed.response : response.body.data
}
