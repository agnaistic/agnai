import { assertValid } from '/common/valid'
import { chatGenSettings } from '../../../common/presets'
import { config } from '../../config'
import { store } from '../../db'
import { StatusError, errors, handle } from '../wrap'
import { sendMany } from '../ws'
import { personaValidator } from './common'
import { AppSchema } from '/common/types'

export const updateChat = handle(async ({ params, body, user, userId }) => {
  assertValid(
    {
      name: 'string',
      mode: ['standard', 'adventure', 'companion'],
      adapter: ['default', ...config.adapters] as const,
      greeting: 'string?',
      scenario: 'string?',
      sampleChat: 'string?',
      memoryId: 'string?',
      overrides: { '?': 'any?', ...personaValidator },
      scenarioIds: ['string?'],
      useOverrides: 'boolean?',
      userEmbedId: 'string?',
      scenarioStates: ['string?'],
    },
    body,
    true
  )

  const id = params.id
  const prev = await store.chats.getChatOnly(id)
  if (!prev || prev?.userId !== user?.userId) throw errors.Forbidden

  if (body.scenarioIds) {
    const scenarios = await store.scenario.getScenariosById(body.scenarioIds)
    for (const scenario of scenarios) {
      if (scenario.userId !== userId) {
        throw new StatusError('You do not have access to this scenario', 403)
      }
    }
  }

  const update: PartialUpdate<AppSchema.Chat> = {
    name: body.name ?? prev.name,
    mode: body.mode ?? prev.mode,
    adapter: body.adapter ?? prev.adapter,
    memoryId: body.memoryId ?? prev.memoryId,
    userEmbedId: body.userEmbedId ?? prev.userEmbedId,
    scenarioIds: body.scenarioIds ?? prev.scenarioIds,
    scenarioStates: body.scenarioStates ?? prev.scenarioStates,
  }

  if (body.useOverrides === false) {
    update.overrides = null
    update.greeting = null
    update.scenario = null
    update.sampleChat = null
  }

  if (body.useOverrides === true) {
    update.greeting = body.greeting || ''
    update.scenario = body.scenario || ''
    update.sampleChat = body.sampleChat || ''
    update.overrides = body.overrides
  }

  const chat = await store.chats.update(id, update)
  return chat
})

/**
 * @deprecated
 */
export const updateMessage = handle(async ({ body, params, userId }) => {
  assertValid({ message: 'string' }, body)
  const prev = await store.chats.getMessageAndChat(params.id)

  if (!prev || !prev.chat) throw errors.NotFound
  if (prev.chat?.userId !== userId) throw errors.Forbidden

  const message = await store.msgs.editMessage(params.id, { msg: body.message, state: 'edited' })

  sendMany(prev.chat?.memberIds.concat(prev.chat.userId), {
    type: 'message-edited',
    messageId: params.id,
    message: body.message,
  })

  return message
})

export const updateMessageProps = handle(async ({ body, params, userId }) => {
  assertValid({ imagePrompt: 'string?', msg: 'string?' }, body)

  const prev = await store.chats.getMessageAndChat(params.id)

  if (!prev || !prev.chat) throw errors.NotFound
  if (prev.chat?.userId !== userId) throw errors.Forbidden

  const update: Partial<AppSchema.ChatMessage> = {
    imagePrompt: body.imagePrompt || prev.msg.imagePrompt,
    msg: body.msg ?? prev.msg.msg,
  }

  const message = await store.msgs.editMessage(params.id, {
    ...update,
    state: body.msg === undefined ? prev.msg.state : 'edited',
  })

  sendMany(prev.chat?.memberIds.concat(prev.chat.userId), {
    type: 'message-edited',
    messageId: params.id,
    imagePrompt: body.imagePrompt || prev.msg.imagePrompt,
    message: body.msg || prev.msg.msg,
  })

  return message
})

export const restartChat = handle(async (req) => {
  const chatId = req.params.id
  await store.chats.restartChat(req.userId, chatId)
  return { success: true }
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
