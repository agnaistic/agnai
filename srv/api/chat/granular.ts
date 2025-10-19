import { Response } from 'express'
import { AppRequest, errors, wrap } from '../wrap'
import { assertValid, UnwrapBody } from '/common/valid'
import { createInferenceStream } from '/srv/adapter/generate'
import { sendGuest, sendMany, sendOne } from '../ws'
import { store } from '/srv/db'

const validInference = {
  requestId: 'string',
  chatId: 'string',
  messageId: 'string',
  messages: ['string?'],
  prompt: 'string',

  settings: 'any?',
  user: 'any',
  presetId: 'string?',
  jsonSchema: 'any?',
  parentId: 'string?',
} as const

type ChatRequest = UnwrapBody<typeof validInference>

type Ticker = Awaited<ReturnType<typeof createInferenceStream>>['stream']

/**
 * Save RETRY on handleStreamc complete
 * Implement SEND (needs characterId)
 * Implement CONTINUE (use retry?)
 *
 * Thoughts: Don't stream to all other users?
 * 1. Send stream result to client
 * 2. Client tells API what to do? (Message update/create)
 * 3. The Message update/create will automatically notify subscribers?
 */

export const retryStream = wrap(async (req, res) => {
  const { userId, body, socketId } = req
  toEventStream(res)
  assertValid(validInference, body)

  if (userId) {
    if (!req.authed) throw errors.Unauthorized
    body.user = req.authed
  }

  const signal = new AbortController()

  try {
    const { stream } = await createInferenceStream({
      user: body.user!,
      log: req.log,
      prompt: body.prompt,
      messages: body.messages,
      settings: body.settings,
      guest: userId ? undefined : socketId,
      jsonSchema: body.jsonSchema,
      signal,
    })

    const result = await handleStream({ req, res, body, stream })

    result.response
  } catch (ex: any) {
    if (ex?.name === 'AbortError') {
      signal.abort()
    }
  } finally {
    res.write(`[DONE]\n\n`)
    res.end()
  }
})

async function handleStream(opts: {
  req: AppRequest
  res: Response
  body: ChatRequest
  stream: Ticker
}) {
  let partial = ''
  let response = ''
  let meta = {}
  let error: string | undefined = undefined
  let warning

  const members = opts.req.userId
    ? await getBroadcastMembers({ userId: opts.req.userId, chatId: opts.body.chatId })
    : []

  const wrapped = (data: any, userOnly?: boolean) => {
    opts.res.write(`data: ${JSON.stringify(data)}\n\n`)

    const payload = {
      ...data,
      chatId: opts.body.chatId,
      messageId: opts.body.messageId,
      requestId: opts.req.requestId,
    }

    if (!opts.req.userId) {
      sendGuest(opts.req.socketId, payload)
      return
    }

    if (userOnly) {
      sendOne(opts.req.userId, payload)
      return
    }

    sendMany(members, payload)
  }

  for await (const gen of opts.stream) {
    if (typeof gen === 'string') {
      response = gen
      continue
    }

    if ('meta' in gen) {
      Object.assign(meta, gen.meta)
      wrapped({ type: 'message-meta', meta: meta }, true)
    }

    if ('partial' in gen) {
      partial = gen.partial
      wrapped({ type: 'message-partial', partial: gen.partial })
      continue
      // todo: raise
    }

    if ('error' in gen) {
      error = gen.error
      wrapped({ type: 'message-error', error: gen.error })
      continue
    }

    if ('warning' in gen) {
      warning = gen.warning
      wrapped({ type: 'message-warning', warning: gen.warning }, true)
    }
  }

  if (!response && partial) {
    response = partial
  }

  return { response, partial, error, warning, meta }
}

function toEventStream(res: Response) {
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
}

async function getBroadcastMembers(opts: { chatId: string; userId: string }) {
  const chat = await store.chats.getChatOnly(opts.chatId)

  if (!chat) return []

  if (chat.userId !== opts.userId && !chat.memberIds.includes(opts.userId)) return []

  const members = chat.memberIds.filter((id) => id !== opts.userId)
  return members
}
