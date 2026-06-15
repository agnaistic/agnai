import { store } from '../../db'
import { StatusError, errors, handle } from '../wrap'
import { sendGuest, sendMany } from '../ws'
import { AppSchema } from '../../../common/types/schema'
import { v4 } from 'uuid'
import { getScenarioEventType } from '/common/scenario'
import { JsonOutput } from '/common/prompt'
import { assertValid } from '/common/valid'

const sendValidator = {
  // kind: [
  //   'send-noreply',
  //   'ooc',
  //   'send-event:world',
  //   'send-event:character',
  //   'send-event:hidden',
  //   'send-event:ooc',
  // ],
  kind: 'string?',
  ooc: 'boolean?',
  text: 'string',
  impersonate: 'any?',
  parent: 'string?',
  bot: 'boolean?',
  messageId: 'string?',
  meta: 'any?',
} as const

export const getMessages = handle(async ({ userId, params, query }) => {
  const chatId = params.id

  assertValid({ before: 'string' }, query)
  const before = query.before

  const messages = await store.msgs.getMessages(chatId, before)
  return { messages }
})

export const createMessage = handle(async (req) => {
  const { userId, body, params } = req
  const chatId = params.id
  assertValid(sendValidator, body)

  const impersonate: AppSchema.Character | undefined = body.impersonate

  if (!userId) {
    const guest = req.socketId
    const newMsg = newMessage(body.messageId || v4(), chatId, body.text, {
      userId: body.bot ? undefined : 'anon',
      characterId: impersonate?._id,
      ooc: body.ooc || body.kind === 'ooc' || body.kind === 'send-event:ooc',
      event: body.kind ? getScenarioEventType(body.kind) : undefined,
      parent: body.parent,
      meta: body.meta,
    })
    sendGuest(guest, { type: 'message-created', msg: newMsg, chatId })

    return { success: true, message: newMsg }
  }

  const chat = await store.chats.getChatOnly(chatId)
  if (!chat) throw errors.NotFound
  const members = chat.memberIds.concat(chat.userId)

  await ensureBotMembership(chat, members, impersonate)

  const userMsg = await store.msgs.createChatMessage({
    _id: body.messageId || v4(),
    chatId,
    message: body.text,
    characterId: impersonate?._id,
    senderId: body.bot ? undefined : userId,
    ooc: body.ooc || body.kind === 'ooc' || body.kind === 'send-event:ooc',
    event: body.kind ? getScenarioEventType(body.kind) : undefined,
    parent: body.parent,
    name: impersonate?.name,
    meta: body.meta,
  })

  await store.chats.update(chatId, { treeLeafId: userMsg._id })

  sendMany(members, { type: 'message-created', msg: userMsg, chatId })
  return { success: true, message: userMsg }
})

function newMessage(
  messageId: string,
  chatId: string,
  text: string,
  props: {
    userId?: string
    characterId?: string
    ooc: boolean
    meta?: any
    event: undefined | AppSchema.ScenarioEventType
    retries?: string[]
    parent?: string
    json?: JsonOutput
  }
) {
  const userMsg: AppSchema.ChatMessage = {
    _id: messageId,
    chatId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    kind: 'chat-message',
    retries: props.retries || [],
    msg: text,
    ...props,
  }
  return userMsg
}

async function ensureBotMembership(
  chat: AppSchema.Chat,
  members: string[],
  impersonate: AppSchema.Character | undefined
) {
  const update: Partial<AppSchema.Chat> = {}

  // Ignore ownership of temporary characters
  const characters = chat.characters || {}
  if (
    impersonate &&
    characters[impersonate._id] === undefined &&
    !impersonate._id.startsWith('temp-')
  ) {
    const actual = await store.characters.getCharacter(impersonate.userId, impersonate._id)
    if (!actual) {
      throw new StatusError(
        'Could not create message: Impersonation character does not belong to you',
        403
      )
    }

    // Ensure the caller's character is up to date
    Object.assign(impersonate, actual)
    characters[impersonate._id] = false
    sendMany(members, {
      type: 'chat-character-added',
      chatId: chat._id,
      character: actual,
      active: false,
    })
  }

  update.characters = characters
  await store.chats.update(chat._id, update)
}
