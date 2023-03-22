import { expect } from 'chai'
import { OPENAI_MODELS } from '../common/adapters'
import { createPrompt } from '../common/prompt'
import { getEncoder } from '../common/tokenize'
import { AppSchema } from '../srv/db/schema'
import { toBook, toBot, toBotMsg, toChat, toEntry, toProfile, toUser, toUserMsg } from './util'

const char = toBot('Bot')
const profile = toProfile('You')
const chat = toChat(char, {})
const user = toUser('anon')
const book = toBook('book', [
  toEntry(['1-TRIGGER'], 'ENTRY ONE'),
  toEntry(['10-TRIGGER'], 'ENTRY TWO', 10, 10),
  toEntry(['20-TRIGGER'], 'ENTRY THREE', 20, 20),
  toEntry(['TIE-TRIGGER'], 'ENTRY TIE', 20, 20),
])

describe('Prompt building', () => {
  it('will build a basic prompt', () => {
    const actual = build([botMsg('FIRST'), toMsg('SECOND')])
    expect(actual.prompt).to.equal(
      expected(
        `Bot's Persona: PERSONA`,
        'Scenario: SCENARIO',
        '<START>',
        'Bot: SAMPLE_CHAT',
        'Bot: FIRST',
        'You: SECOND',
        'Bot:'
      )
    )
  })

  it('will build a continue prompt', () => {
    const actual = build([botMsg('FIRST'), toMsg('SECOND')], { continue: 'ORIGINAL' })
    expect(actual.prompt).to.equal(
      expected(
        `Bot's Persona: PERSONA`,
        'Scenario: SCENARIO',
        '<START>',
        'Bot: SAMPLE_CHAT',
        'Bot: FIRST',
        'You: SECOND',
        'Bot: ORIGINAL',
        'Bot:'
      )
    )
  })

  it('will exclude sample chat when gaslight contains sample chat placeholder', () => {
    const actual = build([botMsg('FIRST'), toMsg('SECOND')], {
      continue: 'ORIGINAL',
      chat: { ...chat, adapter: 'openai' },
      settings: { oaiModel: OPENAI_MODELS.Turbo },
    })
    expect(actual.prompt).to.equal(
      expected(
        `Bot's Persona: PERSONA`,
        'Scenario: SCENARIO',
        '<START>',
        'Bot: FIRST',
        'You: SECOND',
        'Bot: ORIGINAL',
        'Bot:'
      )
    )
  })

  it('will include sample chat when gaslight does not sample chat placeholder', () => {
    const actual = build([botMsg('FIRST'), toMsg('SECOND')], {
      continue: 'ORIGINAL',
      chat: { ...chat, adapter: 'openai' },
      settings: { oaiModel: OPENAI_MODELS.Turbo, gaslight: 'Gaslight' },
    })
    expect(actual.prompt).to.equal(
      expected(
        `Bot's Persona: PERSONA`,
        'Scenario: SCENARIO',
        '<START>',
        'Bot: SAMPLE_CHAT',
        'Bot: FIRST',
        'You: SECOND',
        'Bot: ORIGINAL',
        'Bot:'
      )
    )
  })

  it('will include will two memories by weight when triggered', () => {
    const actual = build([botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('10-TRIGGER')])
    expect(actual.prompt).to.equal(
      expected(
        `Bot's Persona: PERSONA`,
        'Scenario: SCENARIO',
        'Facts: ENTRY ONE. ENTRY TWO.',
        '<START>',
        'Bot: SAMPLE_CHAT',
        'Bot: FIRST',
        'You: 1-TRIGGER',
        'You: 10-TRIGGER',
        'Bot:'
      )
    )
  })

  it('will exclude lowest priority memory to fit in budget', () => {
    const limit = getEncoder('kobold')(`ENTRY ONE. ENTRY TWO. ENTREE THREE.`) - 1
    const actual = build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('10-TRIGGER'), toMsg('20-TRIGGER')],
      { settings: { memoryContextLimit: limit } }
    )
    expect(actual.prompt).to.equal(
      expected(
        `Bot's Persona: PERSONA`,
        'Scenario: SCENARIO',
        'Facts: ENTRY TWO. ENTRY THREE.',
        '<START>',
        'Bot: SAMPLE_CHAT',
        'Bot: FIRST',
        'You: 1-TRIGGER',
        'You: 10-TRIGGER',
        'You: 20-TRIGGER',
        'Bot:'
      )
    )
  })

  it('will order by trigger position when weight tie occurs', () => {
    const actual = build([
      botMsg('FIRST'),
      toMsg('1-TRIGGER'),
      toMsg('TIE-TRIGGER'),
      toMsg('20-TRIGGER'),
    ])
    expect(actual.prompt).to.equal(
      expected(
        `Bot's Persona: PERSONA`,
        'Scenario: SCENARIO',
        'Facts: ENTRY ONE. ENTRY TIE. ENTRY THREE.',
        '<START>',
        'Bot: SAMPLE_CHAT',
        'Bot: FIRST',
        'You: 1-TRIGGER',
        'You: TIE-TRIGGER',
        'You: 20-TRIGGER',
        'Bot:'
      )
    )
  })

  it('will exclude memories triggered outside of memory depth', () => {
    const actual = build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      { settings: { memoryDepth: 2 } }
    )

    expect(actual.prompt).to.equal(
      expected(
        `Bot's Persona: PERSONA`,
        'Scenario: SCENARIO',
        'Facts: ENTRY TIE. ENTRY THREE.',
        '<START>',
        'Bot: SAMPLE_CHAT',
        'Bot: FIRST',
        'You: 1-TRIGGER',
        'You: TIE-TRIGGER',
        'You: 20-TRIGGER',
        'Bot:'
      )
    )
  })
})

function build(
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
  } = {}
) {
  return createPrompt({
    char: opts.char || char,
    members: [profile],
    user,
    chat: opts.chat || chat,
    messages: messages.slice().reverse(),
    book: opts.book || book,
    settings: opts.settings,
    continue: opts.continue,
    retry: opts.retry,
  })
}

function botMsg(text: string) {
  return toBotMsg(char, text)
}

function toMsg(text: string) {
  return toUserMsg(profile, text)
}

function expected(...lines: string[]) {
  return lines.join('\n')
}
