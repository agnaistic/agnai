import './init'
import { expect } from 'chai'
import { OPENAI_MODELS } from '../common/adapters'
import { BOT_REPLACE, SELF_REPLACE } from '../common/prompt'
import { toChat, build, botMsg, toMsg, entities, reset } from './util'
import { getTokenCounter } from '../srv/tokenize'

const { chat, replyAs, main } = entities

describe('Prompt building', () => {
  before(reset)

  it('will build a basic prompt', () => {
    const actual = build([botMsg('FIRST'), toMsg('SECOND')])
    expect(actual.template).toMatchSnapshot()
  })

  it('will build a continue prompt', () => {
    const actual = build([botMsg('FIRST')], { continue: 'ORIGINAL', replyAs: main })
    expect(actual.template).toMatchSnapshot()
  })

  // i dont understand this test. @malfoyslastname 2023-06-07
  it('will exclude sample chat when gaslight contains sample chat placeholder', () => {
    const actual = build([botMsg('FIRST'), toMsg('SECOND')], {
      continue: 'ORIGINAL',
      chat: { ...chat, adapter: 'openai' },
      settings: {
        oaiModel: OPENAI_MODELS.Turbo,
        gaslight: `{{char}}'s Persona: {{personality}}
Scenario: {{scenario}}
This is how {{char}} should talk: {{example_dialogue}}`,
        useGaslight: true,
      },
    })
    expect(actual.template).toMatchSnapshot()
  })

  it('will include sample chat when gaslight does not contain sample chat placeholder', () => {
    const actual = build([botMsg('FIRST'), toMsg('SECOND')], {
      continue: 'ORIGINAL',
      chat,
      settings: { service: 'openai', oaiModel: OPENAI_MODELS.Turbo, gaslight: 'Gaslight' },
    })
    expect(actual.template).toMatchSnapshot()
  })

  it('will include will two memories by weight when triggered', () => {
    const actual = build([botMsg('FIRST'), toMsg('10-TRIGGER'), toMsg('1-TRIGGER')])
    expect(actual.template).toMatchSnapshot()
  })

  it('will exclude lowest priority memory to fit in budget', () => {
    const limit = getTokenCounter('main')(`ENTRY ONE. ENTRY TWO. ENTREE THREE.`) - 1
    const actual = build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('10-TRIGGER'), toMsg('20-TRIGGER')],
      {
        settings: { memoryContextLimit: limit },
      }
    )
    expect(actual.template).toMatchSnapshot()
  })

  it('will order by trigger position when weight tie occurs', () => {
    const actual = build([
      botMsg('FIRST'),
      toMsg('1-TRIGGER'),
      toMsg('TIE-TRIGGER'),
      toMsg('20-TRIGGER'),
    ])
    expect(actual.template).toMatchSnapshot()
  })

  it('will exclude matches that are not a whole word match', () => {
    const actual = build([botMsg('LONGWOR A'), toMsg('1-TRIGGER')], {
      settings: { memoryDepth: 2 },
    })

    expect(actual.template).toMatchSnapshot()
  })

  it('will exclude memories triggered outside of memory depth', () => {
    const actual = build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      {
        settings: { memoryDepth: 2 },
      }
    )

    expect(actual.template).toMatchSnapshot()
  })

  it('will include gaslight for non-turbo adapter', () => {
    const actual = build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      {
        settings: { gaslight: 'GASLIGHT {{user}}', useGaslight: true },
      }
    )

    expect(actual.template).toMatchSnapshot()
  })

  it('will include placeholders in the gaslight', () => {
    const actual = build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      {
        settings: {
          gaslight: 'GASLIGHT\n{{user}}\n{{char}}\nFacts:{{memory}}',
          useGaslight: true,
        },
      }
    )

    expect(actual.template).toMatchSnapshot()
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

    expect(actual.template).toMatchSnapshot()
  })

  it('uses the correct replaces for all instances of {{char}}, {{user}}, <BOT>, and <USER>, case insensitive', () => {
    const input =
      '{{char}} loves {{user}}, {{CHAR}} hates {{USER}}, {{Char}} eats {{User}}, <BOT> drinks <USER>, <bot> boops <user>, <Bot> kicks <User>'
    const expected =
      'Haruhi loves Chad, Haruhi hates Chad, Haruhi eats Chad, Haruhi drinks Chad, Haruhi boops Chad, Haruhi kicks Chad'
    const actual = input.replace(BOT_REPLACE, 'Haruhi').replace(SELF_REPLACE, 'Chad')
    expect(actual).to.equal(expected)
  })

  it('will use correct placeholders in scenario and sample chat', () => {
    const actual = build([], { replyAs, char: main, chat: toChat(main) })
    expect(actual.template).toMatchSnapshot()
  })

  it('will omit sample chat when replyAs has no samplechat', () => {
    const actual = build([], {
      replyAs: { ...replyAs, sampleChat: '' },
      char: main,
      chat: toChat(main),
    })
    expect(actual.template).toMatchSnapshot()
  })

  it('will include example dialogue with omitted from template', () => {
    const actual = build(
      [botMsg('FIRST'), toMsg('1-TRIGGER'), toMsg('TIE-TRIGGER'), toMsg('20-TRIGGER')],
      {
        char: { ...main, sampleChat: 'Bot: Example_Dialogue' },
        settings: {
          gaslight: 'GASLIGHT\n{{user}}\n{{char}}\nFacts: {{memory}}',
          useGaslight: false,
        },
      }
    )

    expect(actual.template).toMatchSnapshot()
  })

  it('will include ujb when omitted from gaslight', () => {
    const actual = build([botMsg('bot response')], {
      char: main,
      settings: {
        useGaslight: true,
        gaslight: `GASLIGHT TEMPLATE\n{{user}}\n{{char}}\nAuto-injected text:`,
        ultimeJailbreak: '!!UJB_PROMPT!!',
      },
    })
    expect(actual).to.matchSnapshot()
  })
})

// function expected(...lines: string[]) {
//   // Replace spaces with dots to help with interpreting test results
//   return lines.join('\n').replace(/ /g, '.')
// }
