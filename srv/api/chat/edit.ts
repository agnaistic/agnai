import { assertValid } from 'frisker'
import { config } from '../../config'
import { store } from '../../db'
import { errors, handle } from '../wrap'
import { sendMany } from '../ws'

const genSetting = {
  temp: 'number',
  maxTokens: 'number',
  repetitionPenalty: 'number',
  repetitionPenaltyRange: 'number',
  repetitionPenaltySlope: 'number',
  typicalP: 'number',
  topP: 'number',
  topK: 'number',
  topA: 'number',
  tailFreeSampling: 'number',
} as const

export const updateChat = handle(async ({ params, body, user }) => {
  assertValid(
    {
      name: 'string',
      adapter: ['default', ...config.adapters] as const,
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
      overrides: {
        kind: ['wpp', 'sbf', 'boostyle'],
        attributes: 'any',
      },
    },
    body
  )
  const id = params.id
  const prev = await store.chats.getChat(id)
  if (prev?.userId !== user?.userId) throw errors.Forbidden

  const chat = await store.chats.update(id, body)
  return chat
})

export const updateMessage = handle(async ({ body, params, userId }) => {
  assertValid({ message: 'string' }, body)
  const prev = await store.chats.getMessageAndChat(params.id)

  if (!prev || !prev.chat) throw errors.NotFound
  if (prev.chat?.userId !== userId) throw errors.Forbidden

  const message = await store.chats.editMessage(params.id, body.message)

  sendMany(prev.chat?.memberIds.concat(prev.chat.userId), {
    type: 'message-edited',
    messageId: params.id,
    message: body.message,
  })

  return message
})

export const updateChatGenSettings = handle(async ({ params, userId, body }) => {
  const chatId = params.id
  assertValid(genSetting, body)

  const chat = await store.chats.getChat(chatId)
  if (chat?.userId !== userId) {
    throw errors.Forbidden
  }

  await store.chats.updateGenSetting(chatId, body)
  return { success: true }
})

export const updateChatGenPreset = handle(async ({ params, userId, body }) => {
  const chatId = params.id
  assertValid({ preset: 'string' }, body)

  const chat = await store.chats.getChat(chatId)
  if (chat?.userId !== userId) {
    throw errors.Forbidden
  }

  await store.chats.updateGenPreset(chatId, body.preset)
  return { success: true }
})
