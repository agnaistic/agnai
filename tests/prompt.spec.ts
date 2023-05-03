import { expect } from 'chai'
import { OPENAI_MODELS } from '../common/adapters'
import { createPrompt, BOT_REPLACE, SELF_REPLACE } from '../common/prompt'
import { AppSchema } from '../srv/db/schema'
import { toBook, toChar, toBotMsg, toChat, toEntry, toProfile, toUser, toUserMsg } from './util'
import { getEncoder } from '../srv/tokenize'

const char = toChar('Bot')
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
    const actual = build([botMsg('FIRST'), toMsg('10-TRIGGER'), toMsg('1-TRIGGER')])
    expect(actual.prompt).to.equal(
      expected(
        `Bot's Persona: PERSONA`,
        'Scenario: SCENARIO',
        'Facts: ENTRY ONE. ENTRY TWO',
        '<START>',
        'Bot: SAMPLE_CHAT',
        'Bot: FIRST',
        'You: 10-TRIGGER',
        'You: 1-TRIGGER',
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
        'Facts: ENTRY TWO. ENTRY THREE',
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
        'Facts: ENTRY ONE. ENTRY TIE. ENTRY THREE',
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
        'Facts: ENTRY TIE. ENTRY THREE',
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

  it('will include gaslight for non-turbo adapter', () => {
    const actual = build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      { settings: { gaslight: 'GASLIGHT {{user}}', useGaslight: true } }
    )

    expect(actual.prompt).to.equal(
      expected(
        'GASLIGHT You',
        'Bot: FIRST',
        'You: 1-TRIGGER',
        'You: TIE-TRIGGER',
        'You: 20-TRIGGER',
        'Bot:'
      )
    )
  })

  it('will include placeholders in the gaslight', () => {
    const actual = build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      {
        settings: {
          gaslight: 'GASLIGHT\n{{user}}\n{{char}}\nFacts: {{memory}}',
          useGaslight: true,
        },
      }
    )

    expect(actual.prompt).to.equal(
      expected(
        'GASLIGHT',
        'You',
        'Bot',
        'Facts: ENTRY ONE. ENTRY TIE. ENTRY THREE',
        'Bot: FIRST',
        'You: 1-TRIGGER',
        'You: TIE-TRIGGER',
        'You: 20-TRIGGER',
        'Bot:'
      )
    )
  })

  it('will not use the gaslight when set to false', () => {
    const actual = build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      {
        settings: {
          gaslight: 'GASLIGHT\n{{user}}\n{{char}}\nFacts: {{memory}}',
          useGaslight: false,
        },
      }
    )

    expect(actual.prompt).to.equal(
      expected(
        `Bot's Persona: PERSONA`,
        'Scenario: SCENARIO',
        'Facts: ENTRY ONE. ENTRY TIE. ENTRY THREE',
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

  it('uses the correct replaces for all instances of {{char}}, {{user}}, <BOT>, and <USER>, case insensitive', () => {
    const input =
      '{{char}} loves {{user}}, {{CHAR}} hates {{USER}}, {{Char}} eats {{User}}, <BOT> drinks <USER>, <bot> boops <user>, <Bot> kicks <User>'
    const expectedOutput =
      'Haruhi loves Chad, Haruhi hates Chad, Haruhi eats Chad, Haruhi drinks Chad, Haruhi boops Chad, Haruhi kicks Chad'
    const actualOutput = input.replace(BOT_REPLACE, 'Haruhi').replace(SELF_REPLACE, 'Chad')
    expect(actualOutput).to.equal(expectedOutput)
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
  const encoder = getEncoder('main')
  return createPrompt(
    {
      char: opts.char || char,
      members: [profile],
      user,
      chat: opts.chat || chat,
      messages,
      book: opts.book || book,
      settings: opts.settings,
      continue: opts.continue,
      retry: opts.retry,
    },
    encoder
  )
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
