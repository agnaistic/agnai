import { assertValid } from 'frisker'
import { store } from '../../db'
import { streamResponse } from '../adapter/generate'
import { handle } from '../handle'
import { publishMany } from '../ws/message'

export const createChat = handle(async ({ body, user }) => {
  assertValid(
    {
      characterId: 'string',
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
    },
    body
  )
  const chat = await store.chats.create(body.characterId, { ...body, userId: user?.userId! })
  return chat
})

export const generateMessage = handle(async ({ userId, params, body }, res) => {
  const id = params.id
  assertValid({ message: 'string', history: 'any', ephemeral: 'boolean?', retry: 'boolean?' }, body)

  if (!body.retry) {
    const userMsg = await store.chats.createChatMessage({
      chatId: id,
      message: body.message,
      senderId: userId!,
    })
    res.write(JSON.stringify(userMsg))
  }

  const response = await streamResponse(
    {
      senderId: userId!,
      chatId: id,
      message: body.message,
      history: body.history,
    },
    res
  )

  if (!response) {
    res.end()
    return
  }

  const msg = await store.chats.createChatMessage(
    { chatId: id, message: response.generated, characterId: response.chat.characterId },
    body.ephemeral
  )
  publishMany(response.chat.memberIds.concat(userId!), { type: 'message-created', msg })
  res.write(JSON.stringify(msg))
  res.end()
})
