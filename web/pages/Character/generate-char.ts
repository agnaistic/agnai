import { toGeneratedCharacter } from './util'
import { createCharGenTemplate } from '/common/default-preset'
import { AppSchema } from '/common/types'
import { NewCharacter } from '/web/store'
import { msgsApi } from '/web/store/data/messages'

export async function generateChar(preset: Partial<AppSchema.GenSettings>, description: string) {
  const prompt = createCharGenTemplate(preset).replace(`{{description}}`, description)

  const handler = preset.service === 'openai' ? msgsApi.basicInference : msgsApi.guidance

  return new Promise<NewCharacter>((resolve, reject) => {
    handler({ prompt, settings: preset }, (err, res) => {
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
        sampleChat: `${vars.example1}\n${vars.example2}\n${vars.example3}`,
        scenario: vars.scenario,
      }

      return resolve(char)
    })
  })
}
