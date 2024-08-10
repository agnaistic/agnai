import { AppSchema } from '/common/types'
import { neat } from '/common/util'
import { getUserPreset } from '/web/shared/adapter'
import { toastStore, userStore } from '/web/store'
import { msgsApi, StreamCallback } from '/web/store/data/messages'

type MinCharacter = Pick<
  AppSchema.Character,
  'appearance' | 'scenario' | 'persona' | 'greeting' | 'sampleChat' | 'name' | 'description'
>

export type GenField =
  | 'firstname'
  | 'personality'
  | 'behaviour'
  | 'appearance'
  | 'greeting'
  | 'scenario'
  | 'example1'
  | 'example2'

const parts: Record<string, (prop: string, trait?: string) => string> = {
  scenario: () => `Detailed description of the scene that the character is in`,
  appearance: () =>
    `Extremely brief and terse (50 words or fewer) caption of physical description of the character's eye color, hair color, height, clothes, body, and physical location`,
  trait: (_, trait) => `Description of {{name}}'s "${trait}" personality trait`,
  persona: () => `Outline of the personality and typical behavior of {{name}}`,
  greeting: () => `{{name}}'s first opening dialogue and actions in the scene`,
  sampleChat: () => `Example of {{name}}'s dialogue and actions`,
}

const genFields: Array<keyof AppSchema.Character> = [
  'appearance',
  'scenario',
  'persona',
  'greeting',
  'sampleChat',
]

export async function generateField(opts: {
  char: MinCharacter
  prop: string
  trait?: string
  tick: StreamCallback
}) {
  const { char, prop, trait, tick } = opts
  const handler = prop === 'persona' && trait ? parts.trait : parts[prop]
  if (!handler) {
    toastStore.error(`Cannot generate character field: Invalid field (no handler)`)
    return
  }

  const infix = genFields
    .map((field) => {
      const handler = parts[field]
      if (!handler) return ''

      switch (field) {
        case 'appearance':
        case 'scenario':
        case 'greeting':
        case 'sampleChat':
          const value = char[field]
          if (!value) return ''
          return `<user>${handler(field)}</user>\n<bot>${value}</bot>`

        case 'persona':
          return toPersonaInfix(char.persona, trait)
      }

      return ''
    })
    .filter((p) => !!p.trim())
    .join('\n\n')
  const suffix = `<user>${handler(prop, trait)}</user>\n<bot>`

  const prompt = neat`
  <system>You are a character generator. Write a response that generates information about the following character.</system>

  Character's name:
  ${char.name}

  Character's description:
  ${char.description || ''}

  ${infix}

  ${suffix}`
    .replace(/{{name}}/g, char.name)
    .replace(/\n\n+/g, '\n\n')

  const { user } = userStore.getState()

  const settings = getUserPreset(user?.chargenPreset || user?.defaultPreset)

  msgsApi.inferenceStream(
    { prompt, overrides: { stopSequences: ['\n', '###', '<|'] }, settings },
    tick
  )
}

function toPersonaInfix(persona: AppSchema.Character['persona'], trait?: string) {
  const handler = persona.kind === 'text' ? parts.persona : parts.trait
  if (persona.kind === 'text') {
    const text = persona.attributes?.text?.[0]
    if (!text) return ''
    return `<user>${handler('persona')}</user>\n<bot>${text}</bot>`
  }

  const prompt = Object.entries(persona.attributes)
    .filter(([key]) => key !== trait)
    .map(([key, values]) => {
      const value = values.filter((v) => !!v.trim()).join(', ')
      return [key, value]
    })
    .filter(([_, v]) => !!v)
    .map(([key, value]) => `<user>${handler('persona', key)}</user>\n<bot>${value}</bot>`)
    .join('\n\n')

  return prompt
}
