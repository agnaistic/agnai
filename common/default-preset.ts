import { AppSchema } from '../srv/db/schema'
import { CLAUDE_MODELS, NOVEL_MODELS, OPENAI_MODELS } from './adapters'

const MAX_TOKENS = 80

const builtinPresets = {
  horde: {
    name: 'Horde',
    service: 'horde',
    maxTokens: 80,
    maxContextLength: 1024,
    repetitionPenalty: 1.08,
    repetitionPenaltySlope: 0.9,
    repetitionPenaltyRange: 1024,
    temp: 0.65,
    topK: 0,
    topP: 0.9,
    typicalP: 1,
    topA: 1,
    tailFreeSampling: 0.9,
    order: [6, 0, 1, 2, 3, 4, 5],
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    gaslight: '',
    ultimeJailbreak: '',
    oaiModel: OPENAI_MODELS.Turbo,
    streamResponse: false,
    memoryDepth: 50,
    memoryContextLimit: 256,
    memoryReverseWeight: false,
    useGaslight: false,
    antiBond: false,
  },
  basic: {
    service: 'kobold',
    name: 'Simple',
    maxTokens: MAX_TOKENS,
    maxContextLength: 2048,
    repetitionPenalty: 1.08,
    repetitionPenaltySlope: 0.9,
    repetitionPenaltyRange: 1024,
    temp: 0.65,
    topK: 0,
    topP: 0.9,
    typicalP: 1,
    topA: 1,
    tailFreeSampling: 0.9,
    encoderRepitionPenalty: 1.0,
    penaltyAlpha: 0,
    addBosToken: true,
    banEosToken: false,
    skipSpecialTokens: true,
    order: [0, 1, 2, 3, 4, 5, 6],
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    gaslight: '',
    ultimeJailbreak: '',
    oaiModel: OPENAI_MODELS.Turbo,
    streamResponse: false,
    memoryDepth: 50,
    memoryContextLimit: 500,
    memoryReverseWeight: false,
    useGaslight: false,
    antiBond: false,
  },
  novel_clio: {
    name: 'Clio - Talker C',
    service: 'novel',
    novelModel: NOVEL_MODELS.clio_v1,
    maxTokens: 300,
    maxContextLength: 8000,
    repetitionPenalty: 1.5,
    repetitionPenaltyRange: 8000,
    repetitionPenaltySlope: 0.09,
    frequencyPenalty: 0.03,
    presencePenalty: 0.005,
    temp: 1.05,
    tailFreeSampling: 0.967,
    topK: 80,
    topP: 0.95,
    topA: 0.075,
    order: [1, 3, 4, 0, 2],
    streamResponse: false,
    useGaslight: true,
    gaslight: `{{char}} Memory: {{memory}}
Description of {{char}}: {{personality}}
[ Title: Dialogue between {{char}} and {{user}}; Tags: conversation; Genre: online roleplay ]
This is how the character speaks:{{example_dialogue}}
***
Summary: {{scenario}}`,
  },
  novel_20BC: {
    name: '20BC+',
    service: 'novel',
    maxTokens: MAX_TOKENS,
    maxContextLength: 2048,
    repetitionPenalty: 1.055,
    repetitionPenaltyRange: 2048,
    repetitionPenaltySlope: 3.33,
    temp: 0.65,
    tailFreeSampling: 0.879,
    topK: 20,
    topP: 1,
    order: [0, 1, 2, 3],
    useGaslight: false,
  },
  novel_blueLighter: {
    name: 'Blue Lighter',
    service: 'novel',
    maxTokens: MAX_TOKENS,
    maxContextLength: 2048,
    repetitionPenalty: 1.05,
    repetitionPenaltyRange: 560,
    repetitionPenaltySlope: 0,
    temp: 1.33,
    tailFreeSampling: 0.937,
    topK: 1,
    topP: 1,
    typicalP: 0.965,
    topA: 0.085,
    order: [3, 4, 5, 2, 0],
    useGaslight: false,
  },
  llama: {
    name: 'Llama (TextGen)',
    service: 'ooba',
    maxTokens: MAX_TOKENS,
    maxContextLength: 2048,
    repetitionPenalty: 1.2,
    encoderRepitionPenalty: 1,
    penaltyAlpha: 0,
    temp: 0.7,
    topK: 40,
    topP: 0.5,
    typicalP: 1,
    useGaslight: false,
  },
  openai: {
    name: 'Turbo',
    service: 'openai',
    temp: 0.5,
    oaiModel: OPENAI_MODELS.Turbo,
    streamResponse: false,
    maxTokens: 300,
    maxContextLength: 4095,
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    antiBond: false,
    useGaslight: false,
    gaslight: `Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)
Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
  },
  openaiAlt: {
    name: 'Turbo (#2)',
    service: 'openai',
    temp: 0.5,
    oaiModel: OPENAI_MODELS.Turbo,
    streamResponse: false,
    maxTokens: 300,
    maxContextLength: 4095,
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    ultimeJailbreak: 'Keep OOC out of your reply.',
    gaslight: `Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Write at least 1 paragraph, up to 4. Always stay in character and avoid repetition.
Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
  },
  openaiTurbo: {
    name: 'DaVinci',
    service: 'openai',
    temp: 0.5,
    oaiModel: OPENAI_MODELS.DaVinci,
    streamResponse: false,
    maxTokens: 300,
    maxContextLength: 4095,
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    gaslight: `Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)

Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
  },
  scale: {
    name: 'Scale',
    service: 'scale',
    maxTokens: 300,
    maxContextLength: 7600,
    // Not providing a default gaslight intentionally as most users have thier gaslight configured within Scale.
    gaslight: ``,
  },
  replicate_vicuna_13b: {
    name: 'Replicate (Vicuna 13B)',
    replicateModelType: 'llama',
    replicateModelVersion: '6282abe6a492de4145d7bb601023762212f9ddbbe78278bd6771c8b3b2f2a13b',
    temp: 0.75,
    topP: 1,
    repetitionPenalty: 1,
    service: 'replicate',
    maxTokens: 500,
    maxContextLength: 2048,
    useGaslight: true,
    gaslight: `{{char}}' Persona: {{personality}}
Scenario: {{scenario}}
Facts: {{memory}}
<START>
[DIALOGUE HISTORY]
{{example_dialogue}}`,
  },
  replicate_stablelm_7b: {
    name: 'Replicate (StableLM Tuned Alpha 7B)',
    replicateModelType: 'stablelm',
    replicateModelVersion: 'c49dae362cbaecd2ceabb5bd34fdb68413c4ff775111fea065d259d577757beb',
    temp: 0.75,
    topP: 1,
    repetitionPenalty: 1.2,
    service: 'replicate',
    maxTokens: 100,
    maxContextLength: 2048,
    useGaslight: true,
    gaslight: `Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Write at least 1 paragraph, up to 4. Always stay in character and avoid repetition.
Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
  },
  replicate_open_assistant_pythia_12b: {
    name: 'Replicate (Open-Assistant Pythia 12B)',
    replicateModelType: 'openassistant',
    replicateModelVersion: '28d1875590308642710f46489b97632c0df55adb5078d43064e1dc0bf68117c3',
    temp: 0.75,
    topP: 1,
    repetitionPenalty: 1.2,
    service: 'replicate',
    maxTokens: 500,
    maxContextLength: 2048,
    useGaslight: true,
    gaslight: `{{char}}' Persona: {{personality}}
Scenario: {{scenario}}
Facts: {{memory}}
This is how the character should talk:
{{example_dialogue}}`,
  },
  claude: {
    name: 'Claude V1',
    service: 'claude',
    temp: 1,
    claudeModel: CLAUDE_MODELS.ClaudeV1,
    streamResponse: false,
    maxTokens: 500,
    maxContextLength: 7600,
    gaslight: `Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged).

Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>

export const defaultPresets = {
  ...builtinPresets,
  goose: { ...builtinPresets.basic, service: 'goose' },
} satisfies Record<string, Partial<AppSchema.GenSettings>>

export const defaultTemplate = `{{char}}'s Persona: {{personality}}
Scenario: {{scenario}}
Facts:{{memory}}
Example of {{char}}'s dialogue: {{example_dialogue}}

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
Example of {{char}}'s dialogue:{{example_dialogue}}

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
