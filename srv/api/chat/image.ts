import { assertValid } from '/common/valid'
import { store } from '../../db'
import { generateImage } from '../../image'
import { handle } from '../wrap'
import { joinUrl } from '/common/requests/util'
import { decryptText } from '/srv/db/util'

export const createImage = handle(async ({ body, userId, socketId, log, params }) => {
  assertValid(
    {
      user: 'any?',
      prompt: 'string',
      messageId: 'string?',
      ephemeral: 'boolean?',
      append: 'boolean?',
      source: 'string?',
      parent: 'string?',
      requestId: 'string?',
    },
    body
  )
  const user = userId ? await store.users.getUser(userId) : body.user

  const guestId = userId ? undefined : socketId
  generateImage(
    {
      user,
      prompt: body.prompt,
      chatId: params.id,
      messageId: body.messageId,
      ephemeral: body.ephemeral,
      append: body.append,
      source: body.source || 'unknown',
      parentId: body.parent,
      requestId: body.requestId,
    },
    log,
    guestId
  )
  return { success: true }
})

export const getSdModelList = handle(async (req, res) => {
  assertValid({ url: 'string', key: 'string?', providerId: 'string?' }, req.body)

  try {
    const url = joinUrl(req.body.url, '/sdapi/v1/sd-models')
    const headers: any = { accept: 'application/json' }

    if (req.body.key) {
      headers.Authorization = `Bearer ${req.body.key}`
    } else if (req.body.providerId) {
      const provider = req.authed?.providers?.find((p) => p._id === req.body.providerId)
      const key = decryptText(provider?.key || '', true)
      if (key) {
        headers.Authorization = `Bearer ${key}`
      }
    }

    const result = await fetch(url, { method: 'get', headers })
    const json = await result.json()

    if (!Array.isArray(json)) {
      return { models: [], data: json }
    }

    return { models: json }
  } catch (ex) {}

  return { models: [] }
})
