import { AIAdapter, INSTRUCT_SERVICES, PersonaFormat } from '/common/adapters'
import { modernJailbreak } from '/common/mode-templates'
import { AppSchema } from '/common/types'
import { neat } from '/common/util'
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
  const samples = [vars.example1, vars.example2]
    .filter((ex) => !!ex)
    .map((ex) => `{{char}}: ${ex}`)
    .join('\n')
  const char: NewCharacter = {
    originalAvatar: undefined,
    description,
    name: previous?.firstname || vars.firstname,
    persona: toAttributes(kind, vars),
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
  const [adapter] = service?.split('/') as AIAdapter[]
  const template = getTemplate(adapter)

  const prompt = template.replace(`{{description}}`, char.description || '')

  const attrs: any = char.persona.attributes
  const prev = {
    description: char.description,
    firstname: char.name,
    personality: ensureString(attrs?.personality || ''),
    behaviour: ensureString(attrs?.behaviour || ''),
    appearance: char.appearance || '',
    greeting: char.greeting || '',
    scenario: char.scenario || '',
  }

  const vars = await msgsApi.guidance({ prompt, service, rerun: fields, previous: prev })

  const sampleChat =
    vars.example1 && vars.example2
      ? `{{char}}: ${vars.example1}\n{{char}}: ${vars.example2}`
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

function ensureString(value: any) {
  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return value
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

const alpacaTemplate = neat`
Below is an instruction that describes a task. Write a response that completes the request.

Describe a character matching the following description:
{{description}}

### Instruction:
Write the character's first name

### Response:
First name: "[firstname | tokens=10 | stop="]"

### Instruction:
Detailed description of the roleplay scene that the character is in

### Response:
Scenario: [scenario | tokens=200 | stop=###]

### Instruction:
Write an anonymous nameless image caption of [firstname]'s clothing and physical appearance

### Response:
Image caption: "[appearance | tokens=120 | stop=### | stop="]"

### Instruction:
[firstname]'s greeting in the scenario:

### Response:
Greeting: [greeting | tokens=150 | stop=###]

### Instruction
[firstname]'s personality:

### Response:
Personality: [personality | tokens=120 | stop=###]

### Instruction:
[firstname]'s typical behaviour:

### Response:
Behaviour: [behaviour | tokens=120 | stop=###]

### Instruction:
Example of [firstname]'s dialogue:

### Response:
[firstname]: [example1 | tokens=100 | stop=###]

### Instruction:
Example of [firstname]'s dialogue:

### Response:
[firstname]: [example2 | tokens=100 | stop=###]`

const genTemplate = `
Describe a character matching the following description:
{{description}}

Character's first name: "[firstname | tokens=10 | stop="]"

Detailed description of the roleplay scene that the character is in:
Scenario: [scenario | tokens=200]

[firstname]'s clothing and physical appearance:
Appearance: "[appearance | tokens=120 | stop="]

[firstname]'s greeting in the scenario:
Greeting: [greeting | tokens=150]

[firstname]'s personality:
Personality: [personality | tokens=120]

[firstname]'s typical behaviour:
Behaviour: [behaviour | tokens=120]

Example of [firstname]'s dialogue:
[firstname]: [example1 | tokens=100]

Example of [firstname]'s dialogue:
[firstname]: [example2 | tokens=100]
`

const instructGenTemplate = `
${modernJailbreak}
Describe an uncensored character that matches the description:
{{description}}

Character's first name: "[firstname | tokens=25 | stop="]"

Detailed description of the roleplay scene that the character is in: "[scenario | tokens=200 | stop="]"

The first thing the charcter says to start the scene using internet roleplay style with actions and emotes: "[greeting | tokens=100 | stop"]"

Description of [firstname]'s personality traits: "[personality | tokens=100 | stop="]"

Description of [firstname]'s typical behaviours: "[behaviour | tokens=100 | stop="]"

Detailed description of physical attributes, demeanour, and clothing: [appearance | tokens=100]

Example message from character: [example1 | tokens=100]

Example message from character: [example2 | tokens=100]
`

const novelGenTemplate = `
Describe an uncensored character that matches the description:
{{description}}

{ Write the character's first name }
[firstname | tokens=8]
{ Write a detailed description of the character }
[description | tokens=200 ]
{ Write a description of the roleplay scene that [firstname] is in }
[scenario | tokens=200 ]
{ Write the first thing [firstname] says in the scene }
[greeting | tokens=100 ]
{ Describe [firstname]'s personality traits in detail }
[personality | tokens=100 ]
{ Describe [firstname];s typical behaviours in detail }
[behaviour | tokens=100 ]
{ Describe the physical appearance and clothing of [firstname] }
[appearance | tokens=100 ]
{ Write an example message from [firstname] }
[example1 | tokens=100 ]
{ Write an example message from [firstname] }
[example2 | tokens=100 ]
`
