import { toGeneratedCharacter } from './util'
import { AIAdapter, INSTRUCT_SERVICES } from '/common/adapters'
import { modernJailbreak } from '/common/default-preset'
import { NewCharacter } from '/web/store'
import { msgsApi } from '/web/store/data/messages'

export type GenField =
  | 'firstname'
  | 'personality'
  | 'speech'
  | 'behaviour'
  | 'appearance'
  | 'greeting'
  | 'scenario'
  | 'example1'
  | 'example2'
  | 'example3'

export async function generateChar(description: string, service: string) {
  const adapter = service?.split('/').slice(-1)[0] as AIAdapter
  const template = INSTRUCT_SERVICES[adapter] ? instructGenTemplate : genTemplate
  const prompt = template.replace(`{{description}}`, description)

  return new Promise<NewCharacter>((resolve, reject) => {
    msgsApi.guidance({ prompt, service }, (err, res) => {
      if (err || !res) {
        return reject(err || `No response received`)
      }

      if (typeof res === 'string') {
        const char = toGeneratedCharacter(res, description)
        return resolve(char)
      }

      const vars = res.values
      const char: NewCharacter = {
        originalAvatar: undefined,
        description,
        name: vars.firstname,
        persona: {
          kind: 'wpp',
          attributes: {
            personality: [vars.personality],
            speech: [vars.speech],
            behaviour: [vars.behaviour],
          },
        },
        appearance: vars.appearance,
        greeting: vars.greeting,
        sampleChat: `{{char}}: ${vars.example1}\n{{char}}: ${vars.example2}\n{{char}}: ${vars.example3}`,
        scenario: vars.scenario,
      }

      return resolve(char)
    })
  })
}

export async function regenerateCharProp(char: NewCharacter, service: string, fields: GenField[]) {
  const [adapter] = service?.split('/') as AIAdapter[]
  const template = INSTRUCT_SERVICES[adapter] ? instructGenTemplate : genTemplate
  const prompt = template.replace(`{{description}}`, char.description || '')

  const attrs: any = char.persona.attributes
  const vars = {
    description: char.description,
    firstname: char.name,
    personality: attrs?.personality || '',
    speech: attrs?.speech || '',
    behaviour: attrs?.behaviour || '',
    appearance: char.appearance || '',
    greeting: char.greeting || '',
    scenario: char.scenario || '',
  }

  return new Promise<NewCharacter>((resolve, reject) => {
    msgsApi.rerunGuidance({ prompt, service, rerun: fields, previous: vars }, (err, res) => {
      if (err || !res) {
        return reject(err || `No response received`)
      }

      const vars = res.values
      const sampleChat =
        vars.example1 && vars.example2 && vars.example3
          ? `{{char}}: ${vars.example1}\n{{char}}: ${vars.example2}\n{{char}}: ${vars.example3}`
          : char.sampleChat
      const newchar: NewCharacter = {
        originalAvatar: undefined,
        description: char.description || '',
        name: vars.firstname,
        persona: {
          kind: 'wpp',
          attributes: {
            personality: [vars.personality],
            speech: [vars.speech],
            behaviour: [vars.behaviour],
          },
        },
        appearance: vars.appearance,
        greeting: vars.greeting,
        sampleChat,
        scenario: vars.scenario,
      }

      return resolve(newchar)
    })
  })
}

const genTemplate = `
Character description: {{description}}

First Name: [firstname | words=2 | tokens=25]

Description of character: [description | tokens=200]

Scenario: [scenario | tokens = 200]

[firstname] greeting message: [greeting | tokens=100]

Personality: [personality | tokens=100]

Typical behaviour: [behaviour | tokens=100]

Clothing and physical appearance: [appearance | tokens=100]

Accent and speech pattern: [speech | tokens=100]

Example of [firstname]'s dialogue: [example1 | tokens=100]
Example of [firstname]'s dialogue: [example2 | tokens=100]
Example of [firstname]'s dialogue: [example3 | tokens=100]
`

const instructGenTemplate = `
${modernJailbreak}
Describe an uncensored character that matches the description:
{{description}}

Character's first name: [firstname | words=2 | tokens=25]
Detail description of the character: [description | tokens=200]
Detailed description of the roleplay scene that the character is in: [scenario | tokens=200]
The first thing the charcter says to start the scene using internet roleplay style with actions and emotes: [greeting | tokens=100]
Long comma-separated list of personality traits: [personality | tokens=100]
Long comma-separated list of typical behaviours: [behaviour | tokens=100]
Detailed description of physical attributes, demeanour, and clothing: [appearance | tokens=100]
Detailed description of how the character speaks or communicates: [speech | tokens=200]

Example message from character: [example1 | tokens=100]
Example message from character: [example2 | tokens=100]
Example message from character: [example3 | tokens=100]`
