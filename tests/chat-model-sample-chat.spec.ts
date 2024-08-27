import { expect } from 'chai'
import './init'
import { splitSampleChat, toChatCompletionPayload } from '/srv/adapter/chat-completion'
import { build, reset, toBotMsg, toChar, toChat, toProfile, toUser } from './util'
import { neat } from '/common/util'
import { AdapterProps } from '/srv/adapter/type'
import { getTokenCounter } from '/srv/tokenize'
import { OPENAI_MODELS } from '/common/adapters'

describe('Chat Completion Example Dialogue::', () => {
  before(reset)

  it('should properly convert <START> (case insensitive) and split basic messages', async () => {
    const input = neat`<STaRT>
      Sam: hey there Vader!
      Vader: hi Sam!`
    const output = await testInput(input)
    expect(output).toMatchSnapshot()
  })

  it('should properly understand the first conversation even if it doesnt begin with <START>', async () => {
    const input = neat`Sam: hey there
      Vader: hi!`
    const output = await testInput(input)
    expect(output).toMatchSnapshot()
  })

  it('will interpret everything up to the first name+colon (or <start>) as a system message if the sampleChat string doesnt begin with a name+colon', async () => {
    const input = neat`Vader is nice.
      Sam: hey
      Vader: hi!`
    const output = await testInput(input)
    expect(output).toMatchSnapshot()

    const inputWithStart = neat`Vader is nice.
      <START>
      Sam: hey
      Vader: hi!`
    const outputWithStart = await testInput(inputWithStart)
    expect(outputWithStart).toMatchSnapshot()
  })

  it('should understand when multiple <Start> are used in the sample chat and turn them all into the defined System message saying a new conversation has started', async () => {
    const input = neat`{{char}} is nice.
      <START>
      Sam: hey
      Vader: hi!
      <START>
      Vader: bye Sam
      Sam: byebye Vader`
    const output = await testInput(input)
    expect(output).toMatchSnapshot()
  })

  it('should understand that strings written after <START>, up until the first name+colon, should be a system message.', async () => {
    const input = neat`Sam: hey
      Vader: hi!
      <STaRT>
      test
      Vader: bye Sam
      Sam: byebye Vader
      Vader: I love you Sam
      Sam: me too Vader
      Vader is very excited.`
    const output = await testInput(input)
    expect(output).toMatchSnapshot()
  })

  it('will trim result into budget', async () => {
    const input = neat`
      Sam: Hey
      Vader: Hi!
      <START>
      test
      Vader: This is how I talk
      Sam: Oh, interesting!
      Vader: I also talk like this! *smiles* But this is far too long to include in our budget!
      Sam: More interesting!`
    const actual = await testInput(input, 25)
    expect(actual).to.matchSnapshot()
  })

  it('should correctly separate out system messages it is explicitly handed, such as a post-sample marker string', async () => {
    const input = neat`Sam: hey
      Vader: hi!
      <START>
      Vader: bye Sam
      Sam: byebye Vader
      System: New conversation started. Previous conversations are examples only.`
    const output = await testInput(input)
    expect(output).toMatchSnapshot()
  })

  it('will parse random within depth prompt', async () => {
    const input = neat`
    Vader: hi!
    <START>
    {{#insert 1}}Random character {{random "a"}}{{/insert}}
    Sam: bye!
    Vader: bye bye!
    `
    const output = await testChat(input)
    expect(output).to.matchSnapshot()
  })
})

async function testInput(input: string, budget?: number) {
  const result = await splitSampleChat(
    {
      sampleChat: input,
      char: TEST_CHARACTER_NAME,
      sender: TEST_USER_NAME,
      budget,
    },
    getTokenCounter('openai', OPENAI_MODELS.Turbo)
  )

  return JSON.stringify(result.additions, null, 2)
}

const TEST_CHARACTER_NAME = 'Vader'
const TEST_USER_NAME = 'Sam'

const bot1 = toChar('Sam')
const bot2 = toChar('Vader')
const chat1 = toChat(bot1)
const profile1 = toProfile('Anon')
const user = toUser('User')

async function testChat(prompt: string) {
  const characters = {
    [bot1._id]: bot1,
    [bot2._id]: bot2,
  }

  const parts = await build(
    [
      toBotMsg(bot1, 'hi'),
      toBotMsg(bot2, 'hihi!'),
      toBotMsg(bot1, 'bye'),
      toBotMsg(bot2, 'byebye!'),
    ],
    { char: bot1, replyAs: bot1, chat: chat1, profile: profile1, characters }
  )

  const props: AdapterProps = {
    prompt,
    char: bot1,
    chat: toChat(bot1),
    gen: {},
    impersonate: toChar('Vader'),
    jsonValues: {},
    kind: 'send',
    lines: parts.lines,
    log: {} as any,
    mappedSettings: {},
    members: [toProfile('Anon')],
    parts: parts.parts,
    replyAs: bot1,
    requestId: '',
    sender: profile1,
    user: user.user,
    characters,
  }

  const payload = await toChatCompletionPayload(
    props,
    getTokenCounter('openai', OPENAI_MODELS.Turbo),
    200
  )
  return payload
}
