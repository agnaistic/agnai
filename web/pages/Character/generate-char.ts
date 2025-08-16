import { parseTemplate } from '/common/template-parser'
import { AppSchema } from '/common/types'
import { neat } from '/common/util'
import { getUserPreset } from '/web/shared/adapter'
import { toastStore, userStore } from '/web/store'
import { genApi } from '/web/store/data/inference'
import { StreamCallback } from '/web/store/data/messages'

export type MinCharacter = Pick<
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

const parts: Record<
  string,
  (prop: string, trait?: string) => { instruction: string; post?: string }
> = {
  scenario: () => ({
    instruction: `Detailed description of the scene that the character is in`,
    post: `Scenario:`,
  }),
  appearance: () => ({
    instruction: `Very brief and comma-separated list of BOORU TAGS of the character's gender, eye color, hair color, height, clothes, body, physical location and surroundings`,
    post: `Booru Tags:`,
  }),
  trait: (_, trait) => ({
    instruction: `Provide a description of {{name}}'s "${trait}" personality trait`,
    post: `${trait}:`,
  }),
  persona: () => ({
    instruction: `Provide an outline of the personality and typical behavior of {{name}}`,
    post: `Personality:`,
  }),
  greeting: () => ({
    instruction: `Provide {{name}}'s first opening dialogue and actions in the scene`,
    post: `{{nme}}'s Greeting:`,
  }),
  sampleChat: () => ({ instruction: `Provide an example of {{name}}'s dialogue and actions` }),
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
      if (field === prop) return ''

      switch (field) {
        case 'appearance':
        // return ''
        case 'scenario':
        case 'greeting':
        case 'sampleChat':
          const value = char[field]
          if (!value) return ''
          const { instruction } = handler(field)
          return `<instruct>${instruction}</instruct>\n<assistant>${value}</assistant>`

        case 'persona':
          return toPersonaInfix(char.persona, trait)
      }

      return ''
    })
    .filter((p) => !!p.trim())
    .join('\n\n')

  const { instruction, post } = handler(prop, trait)

  const prompt = neat`
  <system>You are a character generator. Provide information and attributes about the following character.</system>

  <instruct>Character's name:</instruct>
  <assistant>${char.name}</assistant>

  <instruct>Character's description:</instruct>
  <assistant>${char.description || ''}</assistant>

  ${infix}

  <instruct>${instruction}</instruct>
  
  <assistant>${post || 'Response:'}</assistant>`.replace(/{{name}}/g, char.name)

  const { user } = userStore.getState()

  const settings = getUserPreset(user?.chargenPreset || user?.defaultPreset)

  const { blocks } = await parseTemplate(prompt, {})

  genApi.inferenceStream(
    {
      prompt,
      messages: blocks,
      overrides: { stopSequences: ['[/INST]', '###', '<|', '</s>'] },
      settings,
    },
    tick
  )
}

function toPersonaInfix(persona: AppSchema.Character['persona'], trait?: string) {
  const handler = persona.kind === 'text' ? parts.persona : parts.trait
  if (persona.kind === 'text') {
    const text = persona.attributes?.text?.[0]
    if (!text) return ''
    const { instruction } = handler('persona')
    const suffix = `${text}`
    return `<instruct>${instruction}</instruct>\n<assistant>${suffix}</assistant>`
  }

  const prompt = Object.entries(persona.attributes)
    .filter(([key]) => key !== trait)
    .map(([key, values]) => {
      const value = values.filter((v) => !!v.trim()).join(', ')
      return [key, value]
    })
    .filter(([_, v]) => !!v)
    .map(([key, value]) => {
      const { instruction } = handler('persona', key)
      const suffix = `${value}`
      return `<instruct>${instruction}</instruct>\n<assistant>${suffix}</assistant>`
    })
    .join('\n\n')

  return prompt
}
