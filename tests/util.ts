import {
  toBook,
  toBotMsg,
  toChar,
  toChat,
  toEntry,
  toPersona,
  toUser,
  toUserMsg,
} from '../common/dummy'
import { getEncoder } from '/srv/tokenize'
import { AppSchema } from '/common/types/schema'
import { createPrompt, getPromptParts } from '/common/prompt'
import { TemplateOpts, parseTemplate } from '/common/template-parser'

export * from '../common/dummy'

const originalRand = Math.random

export function reset() {
  Math.random = originalRand
}

export function setRand(num: number) {
  Math.random = function () {
    return num
  }
}

const main = toChar('MainChar', {
  scenario: 'MAIN {{char}}',
  sampleChat: 'SAMPLECHAT {{char}}',
  persona: toPersona('MainCharacter talks a lot'),
})

const replyAs = toChar('OtherBot', {
  sampleChat: 'SAMPLECHAT {{char}}',
  scenario: 'REPLYSCENARIO {{char}}',
  persona: toPersona('OtherBot replies a lot'),
})

const { user, profile } = toUser('ChatOwner')
const chat = toChat(main, {}, [main, replyAs])
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

const lines = history.map(
  (h) => `${h.characterId ? characters[h.characterId]?.name : profile.handle}: ${h.msg}`
)

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
  const overChar = { ...main, ...opts.char }
  const characters = toMap([overChar, replyAs])

  const result = createPrompt(
    {
      char: overChar,
      members: [profile],
      user,
      chat: opts.chat || chat,
      messages,
      book: opts.book || book,
      settings: { ...opts.settings, useTemplateParser: true },
      continue: opts.continue,
      retry: opts.retry,
      replyAs: opts.replyAs || replyAs,
      characters,
      sender: profile,
      lastMessage: '',
      chatEmbeds: [],
      userEmbeds: [],
    },
    getEncoder('main')
  )

  const legacy = createPrompt(
    {
      char: overChar,
      members: [profile],
      user,
      chat: opts.chat || chat,
      messages,
      book: opts.book || book,
      settings: opts.settings,
      continue: opts.continue,
      retry: opts.retry,
      replyAs: opts.replyAs || replyAs,
      characters,
      sender: profile,
      lastMessage: '',
      chatEmbeds: [],
      userEmbeds: [],
    },
    getEncoder('main')
  )

  result.template = `*** V2 Parser ***\n\n${result.template}\n\n*** V1 Parser ***\n\n${legacy.template}`
  return result
}

export function botMsg(text: string, from?: AppSchema.Character) {
  return toBotMsg(from || main, text)
}

export function toMsg(text: string) {
  return toUserMsg(profile, text)
}

export function template(
  prompt: string,
  overrides: Partial<TemplateOpts>,
  main?: Partial<AppSchema.Character>
) {
  return parseTemplate(prompt, getParseOpts(overrides, main))
}

type TestOpts = Partial<
  TemplateOpts & {
    settings?: Partial<AppSchema.GenSettings>
    members?: AppSchema.Profile[]
    user?: AppSchema.User
  }
>

function getParseOpts(overrides: TestOpts = {}, charOverrides: Partial<AppSchema.Character> = {}) {
  const overChat = overrides.char ? toChat(overrides.char) : chat
  const overChar = { ...main, ...charOverrides }
  const characters = toMap([overChar, replyAs])
  const parts =
    overrides.parts ||
    getPromptParts(
      {
        char: overChar,
        sender: profile,
        characters: overrides.characters || characters,
        chat: overChat,
        members: overrides.members || [profile],
        replyAs: (overrides.replyAs || replyAs) as any,
        settings: overrides.settings,
        book,
        user: overrides.user || user,
        kind: 'send',
        chatEmbeds: [],
        userEmbeds: [],
      },
      overrides.lines || lines,
      getEncoder('main')
    )

  const base: TemplateOpts = {
    char: overChar,
    characters: overrides.characters || characters,
    chat: overChat,
    replyAs: overrides.replyAs || replyAs,
    lines: overrides.lines || lines,
    members: overrides.members || [profile],
    parts,
    user: overrides.user || user,
    sender: profile,
    lastMessage: '',
    ...overrides,
  }

  return base
}

export function toMap<T extends { _id: string }>(entities: T[]): Record<string, T> {
  return entities.reduce((prev, curr) => Object.assign(prev, { [curr._id]: curr }), {})
}
