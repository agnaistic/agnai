import { NOVEL_MODELS } from '../common/adapters'
import { AppSchema } from '../srv/db/schema'

let counter = Date.now()

export function toChar(name: string): AppSchema.Character {
  return {
    _id: name,
    kind: 'character',
    createdAt: '',
    scenario: 'SCENARIO',
    greeting: 'GREETING',
    sampleChat: '{{char}}: SAMPLE_CHAT',
    name,
    persona: {
      kind: 'text',
      attributes: {
        text: ['PERSONA'],
      },
    },
    updatedAt: '',
    userId: '',
    favorite: false,
  }
}

export function toProfile(name: string): AppSchema.Profile {
  return {
    _id: name,
    handle: name,
    userId: name,
    kind: 'profile',
  }
}

export function toUser(name: string): AppSchema.User {
  const user: AppSchema.User = {
    _id: name,
    username: name,
    hordeKey: '',
    hordeModel: '',
    defaultAdapter: 'kobold',
    admin: true,
    hash: '',
    kind: 'user',
    koboldUrl: '',
    thirdPartyFormat: 'kobold',
    thirdPartyPassword: '',
    luminaiUrl: '',
    novelApiKey: '',
    novelModel: NOVEL_MODELS.krake,
    oaiKey: '',
    oobaUrl: '',
  }
  return user
}

export function toBotMsg(
  bot: AppSchema.Character,
  msg: string,
  props?: Partial<AppSchema.ChatMessage>
): AppSchema.ChatMessage {
  return {
    _id: '',
    chatId: '',
    createdAt: new Date(++counter).toISOString(),
    kind: 'chat-message',
    msg,
    characterId: bot._id,
    updatedAt: '',
    ...props,
  }
}

export function toUserMsg(
  user: AppSchema.Profile,
  msg: string,
  props?: Partial<AppSchema.ChatMessage>
): AppSchema.ChatMessage {
  return {
    _id: '',
    chatId: '',
    createdAt: new Date(++counter).toISOString(),
    kind: 'chat-message',
    msg,
    userId: user.userId,
    updatedAt: new Date().toISOString(),
    ...props,
  }
}

export function toChat(char: AppSchema.Character, props: Partial<AppSchema.Chat>): AppSchema.Chat {
  return {
    _id: '',
    characterId: char._id,
    createdAt: '',
    kind: 'chat',
    greeting: char.greeting,
    scenario: char.scenario,
    sampleChat: char.sampleChat,
    messageCount: 0,
    name: '',
    updatedAt: '',
    userId: '',
    overrides: char.persona,
    memberIds: [],
    ...props,
  }
}

export function toBook(name: string, entries: AppSchema.MemoryEntry[] = []): AppSchema.MemoryBook {
  return {
    _id: name,
    entries,
    kind: 'memory',
    name,
    userId: '',
  }
}

export function toEntry(
  keywords: string[],
  entry: string,
  priority = 0,
  weight = 0
): AppSchema.MemoryEntry {
  return {
    enabled: true,
    name: entry,
    keywords,
    entry,
    priority,
    weight,
  }
}
