require('module-alias/register')
import { expect } from 'chai'
import { extractSystemPromptFromLegacyGaslight } from '../web/pages/Chat/update-gaslight'
import { reset } from './util'

describe('extractSystemPrompt', () => {
  before(reset)

  it('Works per defined test cases', () => {
    for (const { input, expected } of tests) {
      const actual = extractSystemPromptFromLegacyGaslight(input)
      expect(actual.systemPrompt).to.equal(expected.systemPrompt)
      expect(actual.gaslight).to.equal(expected.gaslight)
    }
  })
})

type TestCase = {
  input: string
  expected: {
    systemPrompt: string
    gaslight: string
  }
}

const tests: TestCase[] = [
  {
    input: `Write {{char}}'s next reply. Write two paragraphs. Description of {{char}}: {{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    expected: {
      systemPrompt: `Write {{char}}'s next reply. Write two paragraphs.`,
      gaslight: `{{system_prompt}}
Description of {{char}}: {{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    },
  },
  {
    input: `Write {{char}}'s next reply. Write two paragraphs.
Description of {{char}}: {{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    expected: {
      systemPrompt: `Write {{char}}'s next reply. Write two paragraphs.`,
      gaslight: `{{system_prompt}}
Description of {{char}}: {{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    },
  },
  {
    input: `Write {{char}}'s next reply. Write two paragraphs.
Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    expected: {
      systemPrompt: `Write {{char}}'s next reply. Write two paragraphs.`,
      gaslight: `{{system_prompt}}
Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    },
  },
  {
    input: `Write {{char}}'s next reply. Write two paragraphs.

Description of {{char}}:

{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    expected: {
      systemPrompt: `Write {{char}}'s next reply. Write two paragraphs.`,
      gaslight: `{{system_prompt}}
Description of {{char}}:

{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    },
  },
]
