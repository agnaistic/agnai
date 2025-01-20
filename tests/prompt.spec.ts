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

  it('will include two memories by weight when triggered', async () => {
    const actual = await build([botMsg('FIRST'), toMsg('10-TRIGGER'), toMsg('1-TRIGGER')])
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will exclude lowest priority memory to fit in budget', async () => {
    const limit =
      (await getTokenCounter('main', undefined)(`ENTRY ONE\nENTRY TWO\nENTRY THREE`)) - 1
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

  it('uses the correct replaces for all instances of {{char}}, {{user}} case insensitive', async () => {
    const input = '{{char}} loves {{user}}, {{CHAR}} hates {{USER}}, {{Char}} eats {{User}}'
    const expected = 'Haruhi loves Chad, Haruhi hates Chad, Haruhi eats Chad'
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
    delete (actual.template as any).sections
    delete actual.template.length
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

  it('will put char book entries with higher weight after mem book entries', async () => {
    const char = {
      ...main,
      characterBook: toBook('main char book', [toEntry(['TRIGGER'], 'ENTRY 20', 0, 20)]),
    }

    const actual = await build([toMsg('TRIGGER')], {
      char: char,
      replyAs: char,
      book: toBook('chat mem book', [toEntry(['TRIGGER'], 'ENTRY 10', 0, 10)]),
      settings: { memoryDepth: 1 },
    })

    expect(actual.template.parsed).to.include('ENTRY 10')
    expect(actual.template.parsed).to.include('ENTRY 20')
    expect(actual.template.parsed.indexOf('ENTRY 20')).to.be.greaterThan(
      actual.template.parsed.indexOf('ENTRY 10')
    )
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will put mem book entries with higher weight after char book entries', async () => {
    const char = {
      ...main,
      characterBook: toBook('main char book', [toEntry(['TRIGGER'], 'ENTRY 10', 0, 10)]),
    }

    const actual = await build([toMsg('TRIGGER')], {
      char: char,
      replyAs: char,
      book: toBook('chat mem book', [toEntry(['TRIGGER'], 'ENTRY 20', 0, 20)]),
      settings: { memoryDepth: 1 },
    })

    expect(actual.template.parsed).to.include('ENTRY 10')
    expect(actual.template.parsed).to.include('ENTRY 20')
    expect(actual.template.parsed.indexOf('ENTRY 20')).to.be.greaterThan(
      actual.template.parsed.indexOf('ENTRY 10')
    )
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will allow using wildcards in keywords', async () => {
    const char = {
      ...main,
      characterBook: toBook('main char book', [
        toEntry(['?BOOK*'], 'ENTRY 1'),
        toEntry(['BOOK'], 'ENTRY 2'),
        toEntry(['?BOOK'], 'ENTRY 3'),
      ]),
    }

    const actual = await build([toMsg('ebooks')], {
      char: char,
      replyAs: char,
      settings: { memoryDepth: 100 },
    })

    expect(actual.template.parsed).to.include('ENTRY 1')
    expect(actual.template.parsed).not.to.include('ENTRY 2')
    expect(actual.template.parsed).not.to.include('ENTRY 3')
    expect(actual.template.parsed).toMatchSnapshot()
  })

  it('will disallow injecting arbitrary regexes', async () => {
    const char = {
      ...main,
      name: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', //triggers evil regex
      characterBook: toBook('main char book', [
        toEntry(['BOOKS'], 'ENTRY 1'),
        toEntry(['^(a+)+$'], 'evil regex'),
      ]),
    }

    // Warning: the evil regex can kill the event loop
    const actual = await build([botMsg('books')], {
      char: char,
      replyAs: char,
      settings: { memoryDepth: 100 },
    })

    expect(actual.template.parsed).to.include('ENTRY 1')
    expect(actual.template.parsed).not.to.include('evil regex')
    expect(actual.template.parsed).toMatchSnapshot()
  })
})
