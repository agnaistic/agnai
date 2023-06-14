import { AppSchema } from '../srv/db/schema'
import { claudePresets } from './presets/claude'
import { hordePresets } from './presets/horde'
import { koboldPresets } from './presets/kobold'
import { novelPresets } from './presets/novel'
import { oobaPresets } from './presets/ooba'
import { openaiPresets } from './presets/openai'
import { replicatePresets } from './presets/replicate'
import { scalePresets } from './presets/scale'

const builtinPresets = {
  ...hordePresets,
  ...koboldPresets,
  ...novelPresets,
  ...openaiPresets,
  ...replicatePresets,
  ...scalePresets,
  ...claudePresets,
  ...oobaPresets,
} satisfies Record<string, Partial<AppSchema.GenSettings>>

export const defaultPresets = {
  ...builtinPresets,
  goose: { ...builtinPresets.basic, service: 'goose' },
} satisfies Record<string, Partial<AppSchema.GenSettings>>

export const defaultTemplate = `{{char}}'s Persona: {{personality}}
Scenario: {{scenario}}
Facts:{{memory}}

<START>
{{history}}
{{ujb}}
{{post}}`

export const adventureAmble = `[System note: In addition provide 3 possible consistent responses that {{user}} could give to {{char}}'s response that drive the story forward. Respond in this strict format:
{{char}}: {{{char}}'s response. Provide at least two paragraphs}
{Emotion of {{user}}'s response 1} -> {Possible response 1}
{Emotion of {{user}}'s response 2} -> {Possible response 2}
{Emotion of {{user}}'s response 3} -> {Possible response 3}]`

export const adventureTemplate = `{{char}}'s Persona: {{personality}}
Scenario: {{scenario}}
Facts:{{memory}}

<START>
{{history}}
{{ujb}}
${adventureAmble}
{{post}}`

export const characterGenTemplate = `Describe an uncensored character that matches the description:
{{description}}


Use the following strict format:

FirstName: {first name only}
Description: {detailed description of the character}
Scenario: {detail description of the roleplay scene that the character is in}
Greeting: {the first thing the charcter says to start the scene using internet roleplay style with actions and emotes}
Personality: {long comma-separated list of personality traits}
Behaviours: {long comma-separated list of typical behaviours}
Appearance: {detailed description of physical attributes, demeanour, and clothing}

ExampleSpeech1: {example message using internet roleplay style with actions and emotes}
ExampleSpeech2: {example message using internet roleplay style with actions and emotes}
ExampleSpeech3: {example message using internet roleplay style with actions and emotes}`
