import { expect } from 'chai'
import './init'
import { reset, setRand, toBotMsg, toChar, toChat, toProfile, toUser, toUserMsg } from './util'
import { getPromptParts } from '/common/prompt'
import { TemplateOpts, parseTemplate } from '/common/template-parser'
import { AppSchema } from '/common/types'
import { getTokenCounter } from '/srv/tokenize'

const chars = [toChar('Robot'), toChar('Otherbot'), toChar('Thirdbot')]
const char = chars[0]
const { user } = toUser('sender')
const characters = chars.reduce<Record<string, AppSchema.Character>>(
  (prev, curr) => Object.assign(prev, { [curr._id]: curr }),
  {}
)
const chat = toChat(char)
const profile = toProfile('Sender')
const members = [profile]
const history = [
  toBotMsg(char, 'First message'),
  toUserMsg(profile, 'User response'),
  toBotMsg(chars[1], 'Multibot message'),
]
const lines = history.map(
  (h) => `${h.characterId ? characters[h.characterId]?.name : profile.handle}: ${h.msg}`
)

describe('Template parser tests', () => {
  before(reset)

  it('will render a basic template', () => {
    const actual = test(`Scenario: {{scenario}}\nPersona: {{personality}}`)
    expect(actual).toMatchSnapshot()
  })

  it('will render conditional', () => {
    const actual = test(`{{#if scenario}}Scenario: {{scenario}}{{/if}}`)
    expect(actual).toMatchSnapshot()
  })

  it('will not render missing conditional', () => {
    const actual = test(
      `{{#if scenario}}Scenario: {{scenario}}{{/if}}Persona: {{persona}}`,
      { char: toChar('Name', { scenario: '' }) },
      { scenario: '' }
    )
    expect(actual).toMatchSnapshot()
  })

  it('will iterate over messages', () => {
    const actual = test(`Scenario: {{scenario}}
{{#each history}}{{.i}} {{.dialogue}}{{/each}}`)
    expect(actual).toMatchSnapshot()
  })

  it('will create a full template', () => {
    const actual = test(
      `
Scenario: {{scenario}}
{{char}}'s persona: {{persona}}
{{#each bots}}{{.name}}'s persona: {{.persona}}{{/each}}

{{#if example_dialogue}}Example dialogue: {{example_dialogue}}{{/if}}
<START>
{{#each history}}- {{.name}}: {{.dialogue}}{{/each}}
(System: Reply as {{char}})
{{post}}`.trim()
    )
    expect(actual).toMatchSnapshot()
  })

  it('will handle history conditions correctly', () => {
    const actual = test(
      `
Scenario: {{scenario}}
{{char}}'s persona: {{persona}}
{{#each bots}}{{.name}}'s persona: {{.persona}}{{/each}}

{{#each history}}{{#if .isbot}}Assistant: {{/if}}{{#if .isuser}}Human: {{/if}}{{.name}}: {{.dialogue}}{{/each}}
{{post}}`.trim()
    )
    expect(actual).toMatchSnapshot()
  })

  it('will render a random placeholder', () => {
    {
      setRand(1 / 3)
      const actual = test(`Random {{random: one, two, three}}`)
      expect(actual).to.equal('Random two')
    }

    {
      setRand(2 / 3)
      const actual = test(`Random {{random: one, two, three}}`)
      expect(actual).to.equal('Random three')
    }
  })
})

function test(
  template: string,
  overrides: Partial<TemplateOpts> = {},
  charOverrides: Partial<AppSchema.Character> = {}
) {
  return parseTemplate(template, getParseOpts(overrides, charOverrides))
}

function getParseOpts(
  overrides: Partial<TemplateOpts> = {},
  charOverrides: Partial<AppSchema.Character> = {}
) {
  const overChat = overrides.char ? toChat(overrides.char) : chat
  const overChar = { ...char, ...charOverrides }
  const parts = getPromptParts(
    {
      char: overChar,
      characters,
      chat: overChat,
      members,
      replyAs: overChar,
      user,
      kind: 'send',
      sender: profile,
      chatEmbeds: [],
      userEmbeds: [],
    },
    lines,
    getTokenCounter('openai', 'turbo')
  )

  const base: TemplateOpts = {
    char,
    characters,
    chat: overChat,
    replyAs: char,
    lines,
    parts,
    sender: profile,
    lastMessage: '',
    ...overrides,
  }

  return base
}
