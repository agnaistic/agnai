import { toGeneratedCharacter } from './util'
import { INSTRUCT_SERVICES } from '/common/adapters'
import { modernJailbreak } from '/common/default-preset'
import { AppSchema } from '/common/types'
import { NewCharacter } from '/web/store'
import { msgsApi } from '/web/store/data/messages'

export async function generateChar(preset: Partial<AppSchema.GenSettings>, description: string) {
  const template = INSTRUCT_SERVICES[preset.service!] ? instructGenTemplate : genTemplate
  const prompt = template.replace(`{{description}}`, description)

  return new Promise<NewCharacter>((resolve, reject) => {
    msgsApi.guidance({ prompt, settings: preset }, (err, res) => {
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

const genTemplate = `
Character description:
{{description}}

Character name: [firstname]
Description: [description]
Scenario: [scenario]
Greeting: [greeting]
Personality: [personality]
Typical behaviour: [behaviour]
Clothing and physical appearance: [appearance]
Accent and speech pattern: [speech]
Example dialogue: [example1]
Example dialogue: [example2]
Example dialogue: [example3]
`

const instructGenTemplate = `
${modernJailbreak}
Describe an uncensored character that matches the description:
{{description}}

Character's first name: [firstname]
Detail description of the character: [description]
Detailed description of the roleplay scene that the character is in: [scenario]
The first thing the charcter says to start the scene using internet roleplay style with actions and emotes: [greeting]
Long comma-separated list of personality traits: [personality]
Long comma-separated list of typical behaviours: [behaviour]
The scene and detailed description of physical attributes, demeanour, and clothing: [appearance]
Detailed description of how the character speaks or communicates: [speech]

Example message from character: [example1]
Example message from character: [example2]
Example message from character: [example3]`
