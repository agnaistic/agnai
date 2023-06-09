require('module-alias/register')
import { expect } from 'chai'
import { exampleMsgId, NEW_CONVO_STARTED, sampleChatStringToMessages } from '../common/prompt'
import { AppSchema } from '../srv/db/schema'
import { dateStringFromUnix } from '../common/util'

describe('sampleChatStringToMessages', () => {
  it('builds the ChatMessage array in compliance with test cases specification', () => {
    testCases.forEach(({ input, expectedOutput }, i) => {
      const output = sampleChatStringToMessages({
        sampleChat: input,
        username: TEST_USER_NAME,
        charname: TEST_CHARACTER_NAME,
        userId: TEST_USER_ID,
        characterId: TEST_CHARACTER_ID,
        chatId: TEST_CHAT_ID,
      })
      expect(output.length).to.equal(expectedOutput.length)
      output.forEach((outputMsg, i) => {
        expect(outputMsg).to.deep.equal(expectedOutput[i])
      })
    })
  })
})

type TestCase = {
  input: string
  expectedOutput: AppSchema.ChatMessage[]
}

const TEST_CHARACTER_ID = '__test_character_id'
const TEST_USER_ID = '__test_user_id'
const TEST_CHAT_ID = '__test_chat_id'
const TEST_CHARACTER_NAME = 'Vader'
const TEST_USER_NAME = 'Sam'

const testMsg = (
  id: number,
  author: 'user' | 'character' | 'system',
  text: string
): AppSchema.ChatMessage => ({
  _id: exampleMsgId(id),
  kind: 'chat-message',
  chatId: TEST_CHAT_ID,
  characterId: author === 'character' ? TEST_CHARACTER_ID : undefined,
  userId: author === 'user' ? TEST_USER_ID : undefined,
  msg: text,
  createdAt: dateStringFromUnix(id),
  updatedAt: dateStringFromUnix(id),
  system: author === 'system' ? true : undefined,
})

const testCases: TestCase[] = [
  {
    input: ``,
    expectedOutput: [testMsg(0, 'system', NEW_CONVO_STARTED)],
  },
  {
    input: `<STaRT>
{{user}}: hey there {{char}}!
{{char}}: hi {{user}}!`,
    expectedOutput: [
      testMsg(0, 'system', NEW_CONVO_STARTED),
      testMsg(1, 'user', 'hey there Vader!'),
      testMsg(2, 'character', 'hi Sam!'),
      testMsg(3, 'system', NEW_CONVO_STARTED),
    ],
  },
  {
    input: `{{user}}: hey there
{{char}}: hi!`,
    expectedOutput: [
      testMsg(0, 'user', 'hey there'),
      testMsg(1, 'character', 'hi!'),
      testMsg(2, 'system', NEW_CONVO_STARTED),
    ],
  },
  {
    input: `{{char}} is nice.
{{user}}: hey
{{char}}: hi!`,
    expectedOutput: [
      testMsg(0, 'system', 'Vader is nice.'),
      testMsg(1, 'user', 'hey'),
      testMsg(2, 'character', 'hi!'),
      testMsg(3, 'system', NEW_CONVO_STARTED),
    ],
  },
  {
    input: `{{char}} is nice.
<START>
{{user}}: hey
{{char}}: hi!`,
    expectedOutput: [
      testMsg(0, 'system', 'Vader is nice.'),
      testMsg(1, 'system', NEW_CONVO_STARTED),
      testMsg(2, 'user', 'hey'),
      testMsg(3, 'character', 'hi!'),
      testMsg(4, 'system', NEW_CONVO_STARTED),
    ],
  },
  {
    input: `{{char}} is nice.
<START>
{{user}}: hey
{{char}}: hi!
<START>
{{char}}: bye {{user}}
{{user}}: byebye {{char}}`,
    expectedOutput: [
      testMsg(0, 'system', 'Vader is nice.'),
      testMsg(1, 'system', NEW_CONVO_STARTED),
      testMsg(2, 'user', 'hey'),
      testMsg(3, 'character', 'hi!'),
      testMsg(4, 'system', NEW_CONVO_STARTED),
      testMsg(5, 'character', 'bye Sam'),
      testMsg(6, 'user', 'byebye Vader'),
      testMsg(7, 'system', NEW_CONVO_STARTED),
    ],
  },
  {
    input: `{{user}}: hey
{{char}}: hi!
<STaRT>
test
{{char}}: bye {{user}}
{{user}}: byebye {{char}}
<BOT>: I love you <USER>
<User>: me too <bOT>

{{char}} is very violent.`,
    expectedOutput: [
      testMsg(0, 'user', 'hey'),
      testMsg(1, 'character', 'hi!'),
      testMsg(2, 'system', NEW_CONVO_STARTED),
      testMsg(3, 'system', 'test'),
      testMsg(4, 'character', 'bye Sam'),
      testMsg(5, 'user', 'byebye Vader'),
      testMsg(6, 'character', 'I love you Sam'),
      testMsg(7, 'user', 'me too Vader\n\nVader is very violent.'),
      testMsg(8, 'system', NEW_CONVO_STARTED),
    ],
  },
]
