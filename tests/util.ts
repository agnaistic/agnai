import { AppSchema } from '../srv/db/schema'

export function toBot(name: string): AppSchema.Character {
  return {
    _id: name,
    kind: 'character',
    createdAt: '',
    greeting: '',
    name,
    persona: {
      kind: 'text',
      attributes: {
        text: [''],
      },
    },
    sampleChat: '',
    scenario: '',
    updatedAt: '',
    userId: '',
  }
}

export function toUser(name: string): AppSchema.Profile {
  return {
    _id: name,
    handle: name,
    userId: name,
    kind: 'profile',
  }
}

export function toBotMsg(bot: AppSchema.Character, msg: string): AppSchema.ChatMessage {
  return {
    _id: '',
    chatId: '',
    createdAt: '',
    kind: 'chat-message',
    msg,
    characterId: bot._id,
    updatedAt: '',
  }
}

export function toUserMsg(user: AppSchema.Profile, msg: string): AppSchema.ChatMessage {
  return {
    _id: '',
    chatId: '',
    createdAt: '',
    kind: 'chat-message',
    msg,
    userId: user._id,
    updatedAt: '',
  }
}
