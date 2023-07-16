import { toBook, toBotMsg, toChar, toChat, toEntry, toUser, toUserMsg } from '../common/dummy'
import { getEncoder } from '/srv/tokenize'
import { AppSchema } from '/common/types/schema'
import { createPrompt, getPromptParts } from '/common/prompt'
import { ParseOpts, parseTemplate } from '/common/template-parser'

export * from '../common/dummy'

const main = toChar('MainChar', {
  scenario: 'MAIN {{char}}',
  sampleChat: 'SAMPLECHAT {{char}}',
  persona: persona('MainCharacter talks a lot'),
})

const replyAs = toChar('OtherBot', {
  sampleChat: 'SAMPLECHAT {{char}}',
  scenario: 'REPLYSCENARIO {{char}}',
  persona: persona('OtherBot replies a lot'),
})

const { user, profile } = toUser('ChatOwner')
const chat = toChat(main, {}, [replyAs])
const book = toBook('book', [
  toEntry(['1-TRIGGER'], 'ENTRY ONE'),
  toEntry(['10-TRIGGER'], 'ENTRY TWO', 10, 10),
  toEntry(['20-TRIGGER'], 'ENTRY THREE', 20, 20),
  toEntry(['TIE-TRIGGER'], 'ENTRY TIE', 20, 20),
  toEntry(['LONGWORD'], 'ENTRY LONG', 20, 20),
])
const history = [
  toBotMsg(main, 'First message'),
  toUserMsg(profile, 'User response'),
  toBotMsg(replyAs, 'Multibot message'),
]

const characters = toMap([main, replyAs])

const lines = history.map((h) => `${h.characterId ? characters[h.characterId]?.name : profile.handle}: ${h.msg}`)

export const entities = {
  chat,
  user,
  profile,
  main,
  replyAs,
  book,
}

export function build(
  messages: AppSchema.ChatMessage[],
  opts: {
    chat?: AppSchema.Chat
    char?: AppSchema.Character
    profile?: AppSchema.Profile
    user?: AppSchema.User
    members?: AppSchema.Profile[]
    retry?: AppSchema.ChatMessage
    book?: AppSchema.MemoryBook
    continue?: string
    settings?: Partial<AppSchema.GenSettings>
    replyAs?: AppSchema.Character
  } = {}
) {
  const encoder = getEncoder('main')
  const result = createPrompt(
    {
      char: opts.char || main,
      members: [profile],
      user,
      chat: opts.chat || chat,
      messages,
      book: opts.book || book,
      settings: opts.settings,
      continue: opts.continue,
      retry: opts.retry,
      replyAs: opts.replyAs || replyAs,
      characters: {},
      lastMessage: '',
      chatEmbeds: [],
      userEmbeds: [],
    },
    encoder
  )

  return result
}

export function botMsg(text: string) {
  return toBotMsg(main, text)
}

export function toMsg(text: string) {
  return toUserMsg(profile, text)
}

export function template(prompt: string, overrides: Partial<ParseOpts>, main?: Partial<AppSchema.Character>) {
  return parseTemplate(prompt, getParseOpts(overrides, main))
}

function getParseOpts(overrides: Partial<ParseOpts> = {}, charOverrides: Partial<AppSchema.Character> = {}) {
  const overChat = overrides.char ? toChat(overrides.char) : chat
  const overChar = { ...main, ...charOverrides }
  const parts = getPromptParts(
    {
      char: overChar,
      characters,
      chat: overChat,
      members: [profile],
      replyAs: overChar,
      user,
      kind: 'send',
      chatEmbeds: [],
      userEmbeds: [],
    },
    lines,
    getEncoder('main', '')
  )

  const base: ParseOpts = {
    char: main,
    characters,
    chat: overChat,
    replyAs,
    lines,
    members: [profile],
    parts,
    user,
    sender: profile,
    lastMessage: '',
    ...overrides,
  }

  return base
}

export function toMap<T extends { _id: string }>(entities: T[]): Record<string, T> {
  return entities.reduce((prev, curr) => Object.assign(prev, { [curr._id]: curr }), {})
}

function persona(text: string): AppSchema.Persona {
  return {
    kind: 'text',
    attributes: { text: [text] },
  }
}
