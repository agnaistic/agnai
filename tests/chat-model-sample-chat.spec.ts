import { expect } from 'chai'
import './init'
import { splitSampleChat } from '/srv/adapter/openai'
import { getEncoder } from '/srv/tokenize'
import { OPENAI_MODELS } from '/common/adapters'

describe('sampleChatStringToMessages', () => {
  it('should properly convert <START> (case insensitive) and split basic messages', () => {
    const input = `<STaRT>
Sam: hey there Vader!
Vader: hi Sam!`
    const output = sampleChatStringToTestMessages(input).additions
    expect(output).toMatchSnapshot()
  })

  it('should properly understand the first conversation even if it doesnt begin with <START>', () => {
    const input = `Sam: hey there
Vader: hi!`
    const output = sampleChatStringToTestMessages(input).additions
    expect(output).toMatchSnapshot()
  })

  it('should, if the sampleChat string doesnt begin with a name+colon, interpret everything up to the first name+colon (or <start>) as a system message', () => {
    const input = `Vader is nice.
Sam: hey
Vader: hi!`
    const output = sampleChatStringToTestMessages(input).additions
    expect(output).toMatchSnapshot()

    const inputWithStart = `Vader is nice.
<START>
Sam: hey
Vader: hi!`
    const outputWithStart = sampleChatStringToTestMessages(inputWithStart).additions
    expect(outputWithStart).toMatchSnapshot()
  })

  it('should understand when multiple <Start> are used in the sample chat and turn them all into the defined System message saying a new conversation has started', () => {
    const input = `{{char}} is nice.
<START>
Sam: hey
Vader: hi!
<START>
Vader: bye Sam
Sam: byebye Vader`
    const output = sampleChatStringToTestMessages(input).additions
    expect(output).toMatchSnapshot()
  })

  it('should understand that strings written after <START>, up until the first name+colon, should be a system message.', () => {
    const input = `Sam: hey
Vader: hi!
<STaRT>
test
Vader: bye Sam
Sam: byebye Vader
Vader: I love you Sam
Sam: me too Vader
Vader is very violent.`
    const output = sampleChatStringToTestMessages(input).additions
    expect(output).toMatchSnapshot()
  })
})

const sampleChatStringToTestMessages = (input: string) =>
  splitSampleChat({
    sampleChat: input,
    tokensAlreadyConsumed: 0,
    tokenBudget: 9999999,
    encoder: getEncoder('openai', OPENAI_MODELS.Turbo),
    charname: TEST_CHARACTER_NAME,
    username: TEST_USER_NAME,
  })

const TEST_CHARACTER_NAME = 'Vader'
const TEST_USER_NAME = 'Sam'
