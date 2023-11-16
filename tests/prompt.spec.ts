import './init'
import { expect } from 'chai'
import { OPENAI_MODELS } from '../common/adapters'
import { BOT_REPLACE, SELF_REPLACE } from '../common/prompt'
import { toChat, build, botMsg, toMsg, entities, reset, toBook, toEntry } from './util'
import { getTokenCounter } from '../srv/tokenize'

const { chat, replyAs, main } = entities

describe('Prompt building', async () => {
  before(reset)

  it('will build a basic prompt', async () => {
    const actual = await build([botMsg('FIRST'), toMsg('SECOND')])
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will build a continue prompt', async () => {
    const actual = await build([botMsg('FIRST')], { continue: 'ORIGINAL', replyAs: main })
    expect(actual.template.parsed).toMatchSnapshot()
  })

  // i dont understand this test. @malfoyslastname 2023-06-07
  it('will exclude sample chat when gaslight contains sample chat placeholder', async () => {
    const actual = await build([botMsg('FIRST'), toMsg('SECOND')], {
      continue: 'ORIGINAL',
      chat: { ...chat, adapter: 'openai' },
      settings: {
        oaiModel: OPENAI_MODELS.Turbo,
        gaslight: `{{char}}'s Persona: {{personality}}
Scenario: {{scenario}}
This is how {{char}} should talk: {{example_dialogue}}`,
      },
    })
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will include sample chat when gaslight does not contain sample chat placeholder', async () => {
    const actual = await build([botMsg('FIRST'), toMsg('SECOND')], {
      continue: 'ORIGINAL',
      chat,
      settings: { service: 'openai', oaiModel: OPENAI_MODELS.Turbo, gaslight: 'Gaslight' },
    })
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will include will two memories by weight when triggered', async () => {
    const actual = await build([botMsg('FIRST'), toMsg('10-TRIGGER'), toMsg('1-TRIGGER')])
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will exclude lowest priority memory to fit in budget', async () => {
    const limit = (await getTokenCounter('main')(`ENTRY ONE. ENTRY TWO. ENTREE THREE.`)) - 1
    const actual = await build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('10-TRIGGER'), toMsg('20-TRIGGER')],
      {
        settings: { memoryContextLimit: limit },
      }
    )
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will order by trigger position when weight tie occurs', async () => {
    const actual = await build([
      botMsg('FIRST'),
      toMsg('1-TRIGGER'),
      toMsg('TIE-TRIGGER'),
      toMsg('20-TRIGGER'),
    ])
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will exclude matches that are not a whole word match', async () => {
    const actual = await build([botMsg('LONGWOR A'), toMsg('1-TRIGGER')], {
      settings: { memoryDepth: 2 },
    })

    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will exclude memories triggered outside of memory depth', async () => {
    const actual = await build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      {
        settings: { memoryDepth: 2 },
      }
    )

    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will include gaslight for non-turbo adapter', async () => {
    const actual = await build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      {
        settings: { gaslight: 'GASLIGHT {{user}}' },
      }
    )

    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will include placeholders in the gaslight', async () => {
    const actual = await build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      {
        settings: {
          gaslight: 'GASLIGHT\n{{user}}\n{{char}}\nFacts:{{memory}}',
        },
      }
    )

    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will not use the gaslight when set to false', async () => {
    const actual = await build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      {
        settings: {
          gaslight: 'GASLIGHT\n{{user}}\n{{char}}\nFacts: {{memory}}',
        },
      }
    )

    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('uses the correct replaces for all instances of {{char}}, {{user}}, <BOT>, and <USER>, case insensitive', async () => {
    const input =
      '{{char}} loves {{user}}, {{CHAR}} hates {{USER}}, {{Char}} eats {{User}}, <BOT> drinks <USER>, <bot> boops <user>, <Bot> kicks <User>'
    const expected =
      'Haruhi loves Chad, Haruhi hates Chad, Haruhi eats Chad, Haruhi drinks Chad, Haruhi boops Chad, Haruhi kicks Chad'
    const actual = input.replace(BOT_REPLACE, 'Haruhi').replace(SELF_REPLACE, 'Chad')
    expect(actual).to.equal(expected)
  })

  it('will use correct placeholders in scenario and sample chat', async () => {
    const actual = await build([], { replyAs, char: main, chat: toChat(main) })
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will omit sample chat when replyAs has no samplechat', async () => {
    const actual = await build([], {
      replyAs: { ...replyAs, sampleChat: '' },
      char: main,
      chat: toChat(main),
    })
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will include example dialogue with omitted from template (no longer true)', async () => {
    const actual = await build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      {
        char: { ...main, sampleChat: 'Bot: Example_Dialogue' },
        settings: {
          gaslight: 'GASLIGHT\n{{user}}\n{{char}}\nFacts: {{memory}}',
        },
      }
    )

    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will include ujb when omitted from gaslight', async () => {
    const actual = await build([botMsg('bot response')], {
      char: main,
      settings: {
        gaslight: `GASLIGHT TEMPLATE\n{{user}}\n{{char}}\nAuto-injected text:`,
        ultimeJailbreak: '!!UJB_PROMPT!!',
      },
    })
    expect(actual).to.matchSnapshot()
  })

  it('will exclude scenario when empty in condition', async () => {
    const actual = await build([botMsg('first')], {
      char: { ...main, scenario: '' },
      chat: toChat(main, { scenario: '' }),
      settings: {
        gaslight: `Roleplay instructions\n{{#if scenario}}Scenario: {{scenario}}{{/if}}`,
      },
    })

    expect(actual.template.parsed.includes('Scenario')).to.equal(false)
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will include scenario when populated in condition', async () => {
    const actual = await build([botMsg('first')], {
      char: { ...main, scenario: 'Populated scenario' },
      chat: toChat(main, { overrides: undefined }),
      settings: {
        gaslight: `Roleplay instructions\n{{#if scenario}}Scenario: {{scenario}}{{/if}}`,
      },
    })

    expect(actual.template.parsed.includes('Populated scenario')).to.equal(true)
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will use currently speaking character book', async () => {
    const actual = await build([toMsg('TRIGGER')], {
      char: { ...main, characterBook: toBook('main char book', []) },
      replyAs: {
        ...replyAs,
        characterBook: toBook('other char book', [toEntry(['TRIGGER'], 'ENTRY')]),
      },
      settings: { memoryDepth: 1 },
    })

    expect(actual.template.parsed).to.include('ENTRY')
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will not use other character book', async () => {
    const actual = await build([toMsg('TRIGGER')], {
      char: { ...main, characterBook: toBook('main char book', [toEntry(['TRIGGER'], 'ENTRY')]) },
      replyAs: { ...replyAs, characterBook: toBook('other char book', []) },
      settings: { memoryDepth: 1 },
    })

    expect(actual.template.parsed).not.to.include('ENTRY')
    expect(actual.template.parsed).toMatchSnapshot()
  })
})

// function expected(...lines: string[]) {
//   // Replace spaces with dots to help with interpreting test results
//   return lines.join('\n').replace(/ /g, '.')
// }
