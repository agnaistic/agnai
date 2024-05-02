import { v4 } from 'uuid'
import { PersonaFormat } from '/common/adapters'
import { ModelFormat, replaceTags } from '/common/presets/templates'
import { AppSchema } from '/common/types'
import { neat } from '/common/util'
import { NewCharacter } from '/web/store'
import { msgsApi } from '/web/store/data/messages'

export type GenField =
  | 'firstname'
  | 'personality'
  | 'behaviour'
  | 'appearance'
  | 'greeting'
  | 'scenario'
  | 'example1'
  | 'example2'

export async function generateChar(
  name: string,
  description: string,
  service: string,
  kind: PersonaFormat
) {
  const { template } = getTemplate('attributes', {}, 'Alpaca', [])
  const prompt = template.replace(`{{description}}`, description)

  const previous = name ? { firstname: name } : undefined
  const vars = await msgsApi.guidance({ prompt, service, previous })
  const samples = [vars.example1, vars.example2]
    .filter((ex) => !!ex)
    .map((ex) => `{{char}}: ${ex}`)
    .join('\n')
  const char: NewCharacter = {
    originalAvatar: undefined,
    description,
    name: previous?.firstname || vars.firstname,
    persona: toAttributes(kind, vars, {}),
    appearance: vars.appearance,
    greeting: vars.greeting,
    sampleChat: samples,
    scenario: vars.scenario,
  }

  return char
}

export async function regenerateCharProp(
  char: NewCharacter,
  service: string,
  kind: PersonaFormat,
  fields: GenField[]
) {
  const { template, props, aliases } = getTemplate(
    char.persona.kind,
    char.persona.attributes,
    'Alpaca',
    fields
  )

  const prompt = template.replace('{{description}}', char.description || '')

  const prev = {
    description: char.description,
    firstname: char.name,
    ...props,
    appearance: char.appearance || '',
    greeting: char.greeting || '',
    scenario: char.scenario || '',
  }

  const vars = await msgsApi.guidance({ prompt, service, rerun: fields, previous: prev })

  const sampleChat =
    vars.example1 && vars.example2
      ? `{{char}}: ${vars.example1}\n{{char}}: ${vars.example2}`
      : char.sampleChat

  // vars.behaviour ??= prev.behaviour
  // vars.personality ??= prev.personality
  // vars.greeting ??= prev.greeting

  const newchar: NewCharacter = {
    originalAvatar: undefined,
    description: char.description || '',
    name: vars.firstname,
    persona: fields.includes('personality') ? toAttributes(kind, vars, aliases) : char.persona,
    appearance: vars.appearance,
    greeting: vars.greeting,
    sampleChat: fields.includes('example1') ? sampleChat : char.sampleChat,
    scenario: vars.scenario,
  }

  return newchar
}

function toAttributes(
  kind: PersonaFormat,
  vars: Record<string, any>,
  aliases: Record<string, string>
) {
  const persona: AppSchema.Persona = {
    kind,
    attributes: {},
  }

  const attrs: Record<string, string[]> = {}

  if (!kind || kind === 'text') {
    attrs.text = [`${vars.personality}`]
  } else {
    for (const [key, alias] of Object.entries(aliases)) {
      const value = vars[key]
      attrs[alias] = [value]
    }
  }

  persona.attributes = attrs
  return persona
}

function getTemplate(
  kind: 'text' | string,
  attributes: Record<string, string[]>,
  format: ModelFormat,
  fields: string[]
) {
  const aliases: Record<string, string> = {}
  const props: Record<string, string> = {}

  const regenPersonality = fields.includes('personality')

  if (kind === 'text') {
    props.personality = attributes.text?.[0] || ''
    const template = replaceTags(genTemplate.replace('{{personality}}', textPersona), format)
    return { template, props, aliases }
  }

  const names = Object.keys(attributes)

  if (!names.length) {
    aliases.personality = 'personality'
    aliases.behavior = 'behavior'
  } else {
    for (const [key, entry] of Object.entries(attributes)) {
      const modded = `p_${v4().slice(0, 6)}`
      aliases[modded] = key
      props[modded] = entry.join(', ')

      if (regenPersonality) {
        fields.push(modded)
      }
    }
  }

  const personaPrompt = toPersonaPrompt(aliases)
  const template = replaceTags(genTemplate.replace('{{personality}}', personaPrompt), format)

  return { template, aliases, props }
}

function toPersonaPrompt(aliases: Record<string, string>) {
  const lines = Object.entries(aliases).map(([prop, value]) => {
    return toPropPrompt(prop, value)
  })

  return lines.join('\n\n')
}

function toPropPrompt(variable: string, trait: string) {
  return neat`
<user>Write of description of [firstname]'s "${trait}" personality trait:</user>

<bot>[firstname]'s "${trait}" personality trait: [${variable} | tokens=150 | stop=###]</bot>`
}

const textPersona = neat`
<user>Describe [firstname]'s personality and typical behavior:</user>

<bot>[firstname's] personality and typical behavior: [personality | tokens=250 | stop=###]</bot>
`

const genTemplate = neat`
Below is an instruction that describes a task. Write a response that completes the request.

Describe a character matching the following description:
{{description}}

<user>Write the character's first name</user>

<bot>First name: "[firstname | tokens=10 | stop="]"</bot>

<user>Detailed description of the roleplay scene that the character is in</user>

<bot>Scenario: [scenario | tokens=200 | stop=###]</bot>

<user>Write an anonymous nameless image caption of [firstname]'s clothing and physical appearance</user>

<bot>Image caption: "[appearance | tokens=120 | stop=### | stop="]"</bot>

<user>[firstname]'s greeting in the scenario:</user>

<bot>Greeting: [greeting | tokens=150 | stop=###]</bot>

{{personality}}

<user>Example of [firstname]'s dialogue:</bot>

<bot>[firstname]: [example1 | tokens=100 | stop=###]</bot>

<user>Example of [firstname]'s dialogue:</user>

<bot>[firstname]: [example2 | tokens=100 | stop=###]</bot>`
