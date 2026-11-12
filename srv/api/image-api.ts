import { v4 } from 'uuid'
import { store } from '../db'
import { handle, StatusError } from './wrap'
import { assertValid } from '/common/valid'
import { generateImage, generateImageSync } from '../image'

const validApiImage = {
  prompt: 'string',
  negative: 'string?',
  model: 'string?',
  width: 'number?',
  height: 'number?',
  cfg_scale: 'number?',
  clip_skip: 'number?',
  steps: 'number?',
  sampler: 'string?',
  seed: 'number?',
  use_recommended: 'string?',
} as const

const validImage = {
  // All calls
  user: 'any?',
  prompt: 'string',
  ephemeral: 'boolean?',
  noAffix: 'boolean?',
  source: 'string?', // Legacy, deprecated

  // Chats & Characters

  // Characters
  characterId: 'any?',
  requestId: 'string?',

  // Optional model override
  model: 'string?',

  // Chats
  chatId: 'string?',
  messageId: 'string?',
  parent: 'string?', // Legacy, deprecated

  sync: 'boolean?',
} as const

export const generateAppImage = handle(async ({ body, userId, socketId, log }, res) => {
  assertValid(validImage, body)
  const user = userId ? await store.users.getUser(userId) : body.user

  const guestId = userId ? undefined : socketId
  const requestId = body.requestId || v4()

  const opts = {
    user,
    prompt: body.prompt,
    ephemeral: body.ephemeral,
    source: body.source || 'unknown',
    noAffix: body.noAffix,
    chatId: body.chatId,
    characterId: typeof body.characterId === 'string' ? body.characterId : undefined,
    requestId,
    parentId: body.parent,
    model: body.model,
    messageId: body.messageId,
    sync: body.sync,
  }

  if (!body.sync) {
    res.json({ success: true, requestId })
  }

  const job = await generateImage(opts, log, guestId)
  if (body.sync) {
    return { success: !!job.output, requestId, output: job.output, error: job.error }
  }
})

export const generateImageApi = handle(async ({ authed, userId, log, body }) => {
  assertValid(validApiImage, body)

  if (body.use_recommended && authed) {
    authed.useRecommendedImages = body.use_recommended
  }

  const result = await generateImageSync(
    {
      user: authed!,
      model: body.model,
      prompt: body.prompt,
      source: 'api',
      parentId: undefined,
      params: body,
      noAffix: true,
    },
    log
  )

  if (result.error) {
    throw new StatusError(result.error, 500)
  }

  return { output: result.output }
})
