import { handle } from '/srv/api/wrap'

import { translateText } from '/srv/translate'
import { assertValid } from '/common/valid'

export const translate = handle(async ({ body, userId, log, params }) => {
  assertValid(
    {
      user: 'any?',
      text: 'string',
      to: 'string',
      from: 'string?',
      service: 'any',
    },
    body
  )

  return await translateText(
    {
      service: body.service,
      to: body.to,
      from: body.from,
      text: body.text,
      chatId: params.chatId,
    },
    log
  )
})
