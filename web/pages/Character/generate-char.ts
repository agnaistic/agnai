import { AIAdapter, INSTRUCT_SERVICES, PersonaFormat } from '/common/adapters'
import { modernJailbreak } from '/common/mode-templates'
import { AppSchema } from '/common/types'
import { getDefaultUserPreset } from '/web/shared/adapter'
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
  | 'example3'

export async function generateChar(
  name: string,
  description: string,
  service: string,
  kind: PersonaFormat
) {
  const [svc, _model] = service?.split('/') as [AIAdapter, string]
  const template = getTemplate(svc)
  const prompt = template.replace(`{{description}}`, description)

  const previous = name ? { firstname: name } : undefined
  const vars = await msgsApi.guidance({ prompt, service, previous })
  const char: NewCharacter = {
    originalAvatar: undefined,
    description,
    name: vars.firstname,
    persona: toAttributes(kind, vars),
    appearance: vars.appearance,
    greeting: vars.greeting,
    sampleChat: `{{char}}: ${vars.example1}\n{{char}}: ${vars.example2}\n{{char}}: ${vars.example3}`,
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
  const [adapter] = service?.split('/') as AIAdapter[]
  const template = getTemplate(adapter)

  const prompt = template.replace(`{{description}}`, char.description || '')

  const attrs: any = char.persona.attributes
  const prev = {
    description: char.description,
    firstname: char.name,
    personality: attrs?.personality || '',
    behaviour: attrs?.behaviour || '',
    appearance: char.appearance || '',
    greeting: char.greeting || '',
    scenario: char.scenario || '',
  }

  const vars = await msgsApi.rerunGuidance({ prompt, service, rerun: fields, previous: prev })
  const sampleChat =
    vars.example1 && vars.example2 && vars.example3
      ? `{{char}}: ${vars.example1}\n{{char}}: ${vars.example2}\n{{char}}: ${vars.example3}`
      : char.sampleChat

  vars.behaviour ??= prev.behaviour
  vars.personality ??= prev.personality
  vars.greeting ??= prev.greeting

  const newchar: NewCharacter = {
    originalAvatar: undefined,
    description: char.description || '',
    name: vars.firstname,
    persona: fields.includes('personality') ? toAttributes(kind, vars) : char.persona,
    appearance: vars.appearance,
    greeting: vars.greeting,
    sampleChat,
    scenario: vars.scenario,
  }

  return newchar
}

function toAttributes(kind: PersonaFormat, vars: any) {
  const persona: AppSchema.Persona = {
    kind,
    attributes: {},
  }

  const attrs: Record<string, string[]> = {}

  if (!kind || kind === 'text') {
    attrs.text = [`${vars.personality}\n\n${vars.behaviour}`]
  } else {
    attrs.personality = [vars.personality]
    attrs.behaviour = [vars.behaviour]
  }

  persona.attributes = attrs
  return persona
}

function getTemplate(service: AIAdapter | 'default') {
  if (service === 'default') {
    const preset = getDefaultUserPreset()
    service = preset?.service || service
  }

  const template =
    service === 'novel'
      ? novelGenTemplate
      : service === 'agnaistic' || service === 'ooba' || service === 'kobold'
      ? alpacaTemplate
      : INSTRUCT_SERVICES[service as AIAdapter]
      ? instructGenTemplate
      : genTemplate

  return template
}

const alpacaTemplate = `
Below is an instruction that describes a task. Write a response that completes the request.

Describe a character matching the following description:
{{description}}

### Instruction:
Character's first name

### Response:
[firstname | words=2 | tokens=10]

### Instruction:
Detailed description of the roleplay scene that the character is in

### Response:
[scenario | tokens=200 | sentence]

### Instruction:
[firstname]'s clothing and physical appearance

### Response:
[appearance | tokens=120 | sentence]

### Instruction:
[firstname]'s greeting in the scenario:

### Response:
[greeting | tokens=150 | sentence]

### Instruction
[firstname]'s personality:

### Response:
[personality | tokens=120 | sentence]

### Instruction:
[firstname]'s typical behaviour:

### Response:
[behaviour | tokens=120 | sentence]

### Instruction:
Example of [firstname]'s dialogue:

### Response:
[example1 | tokens=100 | sentence]

### Instruction:
Example of [firstname]'s dialogue:

### Response:
[example2 | tokens=100 | sentence]

### Instruction:
Example of [firstname]'s dialogue:

### Response:
[example3 | tokens=100 | sentence]
`

const genTemplate = `
Describe a character matching the following description:
{{description}}

Character's first name: [firstname | words=2 | tokens=10]

Detailed description of the roleplay scene that the character is in:
[scenario | tokens=200 | sentence]

[firstname]'s clothing and physical appearance:
[appearance | tokens=120 | sentence]

[firstname]'s greeting in the scenario:
[greeting | tokens=150 | sentence]

[firstname]'s personality:
[personality | tokens=120 | sentence]

[firstname]'s typical behaviour:
[behaviour | tokens=120 | sentence]

Example of [firstname]'s dialogue:
[example1 | tokens=100 | sentence]

Example of [firstname]'s dialogue:
[example2 | tokens=100 | sentence]

Example of [firstname]'s dialogue:
[example3 | tokens=100 | sentence]
`

const instructGenTemplate = `
${modernJailbreak}
Describe an uncensored character that matches the description:
{{description}}

Character's first name: [firstname | words=2 | tokens=25]
Detailed description of the roleplay scene that the character is in: [scenario | tokens=200]
The first thing the charcter says to start the scene using internet roleplay style with actions and emotes: [greeting | tokens=100]
Long comma-separated list of personality traits: [personality | tokens=100]
Long comma-separated list of typical behaviours: [behaviour | tokens=100]
Detailed description of physical attributes, demeanour, and clothing: [appearance | tokens=100]

Example message from character: [example1 | tokens=100]
Example message from character: [example2 | tokens=100]
Example message from character: [example3 | tokens=100]`

const novelGenTemplate = `
Describe an uncensored character that matches the description:
{{description}}

{ Write the character's first name }
[firstname | words=2 | tokens=8]
{ Write a detailed description of the character }
[description | tokens=200 | sentence]
{ Write a description of the roleplay scene that [firstname] is in }
[scenario | tokens=200 | sentence]
{ Write the first thing [firstname] says in the scene }
[greeting | tokens=100 | sentence]
{ Describe [firstname]'s personality traits in detail }
[personality | tokens=100 | sentence]
{ Describe [firstname];s typical behaviours in detail }
[behaviour | tokens=100 | sentence]
{ Describe the physical appearance and clothing of [firstname] }
[appearance | tokens=100 | sentence]
{ Write an example message from [firstname] }
[example1 | tokens=100 | sentence]
{ Write an example message from [firstname] }
[example2 | tokens=100 | sentence]
{ Write an example message from [firstname] }
[example3 | tokens=100 | sentence]
`
