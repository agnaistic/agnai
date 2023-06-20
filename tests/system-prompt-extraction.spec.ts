require('module-alias/register')
import { expect } from 'chai'
import { extractSystemPromptFromLegacyGaslight } from '../web/pages/Chat/update-gaslight'

describe('extractSystemPrompt', () => {
  it('Works per defined test cases', () => {
    sysPromptExtractionTestCases.forEach((testCase) => {
      const actualOutput = extractSystemPromptFromLegacyGaslight(testCase.inputGaslight)
      console.log(testCase.inputGaslight)
      console.log(actualOutput)
      expect(actualOutput.systemPrompt).to.equal(testCase.expectedOutput.systemPrompt)
      expect(actualOutput.gaslight).to.equal(testCase.expectedOutput.gaslight)
    })
  })
})

type TestCase = {
  inputGaslight: string
  expectedOutput: {
    systemPrompt: string
    gaslight: string
  }
}

const sysPromptExtractionTestCases: TestCase[] = [
  {
    inputGaslight: `Write {{char}}'s next reply. Write two paragraphs. Description of {{char}}: {{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    expectedOutput: {
      systemPrompt: `Write {{char}}'s next reply. Write two paragraphs.`,
      gaslight: `{{system_prompt}}
Description of {{char}}: {{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    },
  },
  {
    inputGaslight: `Write {{char}}'s next reply. Write two paragraphs.
Description of {{char}}: {{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    expectedOutput: {
      systemPrompt: `Write {{char}}'s next reply. Write two paragraphs.`,
      gaslight: `{{system_prompt}}
Description of {{char}}: {{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    },
  },
  {
    inputGaslight: `Write {{char}}'s next reply. Write two paragraphs.
Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    expectedOutput: {
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
    inputGaslight: `Write {{char}}'s next reply. Write two paragraphs.

Description of {{char}}:

{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
    expectedOutput: {
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
