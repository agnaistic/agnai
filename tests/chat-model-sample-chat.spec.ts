import { expect } from 'chai'
import './init'
import { splitSampleChat } from '/srv/adapter/chat-completion'
import { reset } from './util'
import { neat } from '/common/util'

describe('Chat Completion Example Dialogue::', () => {
  before(reset)

  it('should properly convert <START> (case insensitive) and split basic messages', () => {
    const input = neat`<STaRT>
      Sam: hey there Vader!
      Vader: hi Sam!`
    const output = testInput(input)
    expect(output).toMatchSnapshot()
  })

  it('should properly understand the first conversation even if it doesnt begin with <START>', () => {
    const input = neat`Sam: hey there
      Vader: hi!`
    const output = testInput(input)
    expect(output).toMatchSnapshot()
  })

  it('will interpret everything up to the first name+colon (or <start>) as a system message if the sampleChat string doesnt begin with a name+colon', () => {
    const input = neat`Vader is nice.
      Sam: hey
      Vader: hi!`
    const output = testInput(input)
    expect(output).toMatchSnapshot()

    const inputWithStart = neat`Vader is nice.
      <START>
      Sam: hey
      Vader: hi!`
    const outputWithStart = testInput(inputWithStart)
    expect(outputWithStart).toMatchSnapshot()
  })

  it('should understand when multiple <Start> are used in the sample chat and turn them all into the defined System message saying a new conversation has started', () => {
    const input = neat`{{char}} is nice.
      <START>
      Sam: hey
      Vader: hi!
      <START>
      Vader: bye Sam
      Sam: byebye Vader`
    const output = testInput(input)
    expect(output).toMatchSnapshot()
  })

  it('should understand that strings written after <START>, up until the first name+colon, should be a system message.', () => {
    const input = neat`Sam: hey
      Vader: hi!
      <STaRT>
      test
      Vader: bye Sam
      Sam: byebye Vader
      Vader: I love you Sam
      Sam: me too Vader
      Vader is very excited.`
    const output = testInput(input)
    expect(output).toMatchSnapshot()
  })

  it('will trim result into budget', () => {
    const input = neat`
      Sam: Hey
      Vader: Hi!
      <START>
      test
      Vader: This is how I talk
      Sam: Oh, interesting!
      Vader: I also talk like this! *smiles* But this is far too long to include in our budget!
      Sam: More interesting!`
    expect(testInput(input, 25)).to.matchSnapshot()
  })

  it('should correctly separate out system messages it is explicitly handed, such as a post-sample marker string', () => {
    const input = neat`Sam: hey
      Vader: hi!
      <START>
      Vader: bye Sam
      Sam: byebye Vader
      System: New conversation started. Previous conversations are examples only.`
    const output = testInput(input)
    expect(output).toMatchSnapshot()
  })
})

function testInput(input: string, budget?: number) {
  const result = splitSampleChat({
    sampleChat: input,
    char: TEST_CHARACTER_NAME,
    sender: TEST_USER_NAME,
    budget,
  })

  return JSON.stringify(result.additions, null, 2)
}

const TEST_CHARACTER_NAME = 'Vader'
const TEST_USER_NAME = 'Sam'
