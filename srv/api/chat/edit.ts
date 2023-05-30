import { assertValid } from '/common/valid'
import { chatGenSettings } from '../../../common/presets'
import { config } from '../../config'
import { store } from '../../db'
import { errors, handle } from '../wrap'
import { sendMany } from '../ws'
import { personaValidator } from './common'

export const updateChat = handle(async ({ params, body, user }) => {
  assertValid(
    {
      name: 'string',
      mode: ['standard', 'adventure', null],
      adapter: ['default', ...config.adapters] as const,
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
      memoryId: 'string?',
      overrides: personaValidator,
    },
    body,
    true
  )

  const id = params.id
  const prev = await store.chats.getChatOnly(id)
  if (prev?.userId !== user?.userId) throw errors.Forbidden

  const chat = await store.chats.update(id, body)
  return chat
})

export const updateMessage = handle(async ({ body, params, userId }) => {
  assertValid({ message: 'string' }, body)
  const prev = await store.chats.getMessageAndChat(params.id)

  if (!prev || !prev.chat) throw errors.NotFound
  if (prev.chat?.userId !== userId) throw errors.Forbidden

  const message = await store.msgs.editMessage(params.id, { msg: body.message })

  sendMany(prev.chat?.memberIds.concat(prev.chat.userId), {
    type: 'message-edited',
    messageId: params.id,
    message: body.message,
  })

  return message
})

export const updateChatGenSettings = handle(async ({ params, userId, body }) => {
  const chatId = params.id
  assertValid(chatGenSettings, body)

  const chat = await store.chats.getChatOnly(chatId)
  if (chat?.userId !== userId) {
    throw errors.Forbidden
  }

  await store.presets.updateGenSetting(chatId, body)
  return { success: true }
})

export const updateChatGenPreset = handle(async ({ params, userId, body }) => {
  const chatId = params.id
  assertValid({ preset: 'string' }, body)

  const chat = await store.chats.getChatOnly(chatId)
  if (chat?.userId !== userId) {
    throw errors.Forbidden
  }

  await store.presets.updateGenPreset(chatId, body.preset)
  return { success: true }
})
