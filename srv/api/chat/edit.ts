import { assertValid } from '/common/valid'
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
      systemPrompt: 'string?',
      postHistoryInstructions: 'string?',
      imageSource: 'string?',
      imageSettings: 'any?',
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
    imageSource: (body.imageSource as any) ?? prev.imageSource,
    imageSettings: body.imageSettings,
  }

  if (body.useOverrides === false) {
    update.overrides = null
    update.greeting = null
    update.scenario = null
    update.sampleChat = null
    update.systemPrompt = null
    update.postHistoryInstructions = null
  }

  if (body.useOverrides === true) {
    update.greeting = body.greeting || ''
    update.scenario = body.scenario || ''
    update.sampleChat = body.sampleChat || ''
    update.overrides = body.overrides
    update.systemPrompt = body.systemPrompt || ''
    update.postHistoryInstructions = body.postHistoryInstructions || ''
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

export const swapMessage = handle(async ({ body, params, userId }) => {
  assertValid(
    { imagePrompt: 'string?', msg: 'string?', extras: ['string?'], retries: ['string?'] },
    body
  )

  const prev = await store.chats.getMessageAndChat(params.id)

  if (!prev || !prev.chat) throw errors.NotFound
  if (prev.chat?.userId !== userId) throw errors.Forbidden

  const update: Partial<AppSchema.ChatMessage> = {
    imagePrompt: body.imagePrompt || prev.msg.imagePrompt,
    msg: body.msg ?? prev.msg.msg,
    retries: body.retries,
    extras: body.extras || prev.msg.extras,
  }

  const message = await store.msgs.editMessage(params.id, {
    ...update,
    state: body.msg === undefined ? prev.msg.state : 'swapped',
  })

  sendMany(prev.chat?.memberIds.concat(prev.chat.userId), {
    type: 'message-swapped',
    messageId: params.id,
    imagePrompt: body.imagePrompt || prev.msg.imagePrompt,
    message: body.msg || prev.msg.msg,
    extras: body.extras || prev.msg.extras,
  })

  return message
})

export const updateMessageProps = handle(async ({ body, params, userId }) => {
  assertValid(
    {
      imagePrompt: 'string?',
      msg: 'string?',
      extras: ['string?'],
      retries: ['string?'],
      json: 'any?',
    },
    body
  )

  const prev = await store.chats.getMessageAndChat(params.id)

  if (!prev || !prev.chat) throw errors.NotFound
  if (prev.chat?.userId !== userId) throw errors.Forbidden

  const update: Partial<AppSchema.ChatMessage> = {
    imagePrompt: body.imagePrompt || prev.msg.imagePrompt,
    msg: body.msg ?? prev.msg.msg,
    retries: body.retries,
    extras: body.extras || prev.msg.extras,
    json: body.json || prev.msg.json,
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
    extras: body.extras || prev.msg.extras,
  })

  return message
})

export const restartChat = handle(async ({ params, body, userId }) => {
  assertValid({ impersonating: 'string?' }, body)
  const profile = await store.users.getProfile(userId)
  const impersonate = body.impersonating
    ? await store.characters.getCharacter(userId, body.impersonating)
    : undefined

  const chatId = params.id
  await store.chats.restartChat(userId, chatId, profile!, impersonate)
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
