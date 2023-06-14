import { OPENAI_MODELS } from '../adapters'
import { AppSchema } from '/srv/db/schema'

export const openaiPresets = {
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
Facts: {{memory}}`,
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
Facts: {{memory}}`,
  },
  openaiTurbo: {
    name: 'DaVinci',
    service: 'openai',
    temp: 0.5,
    oaiModel: OPENAI_MODELS.DaVinci,
    useGaslight: true,
    streamResponse: false,
    maxTokens: 300,
    maxContextLength: 4095,
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    gaslight: `Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)

Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}`,
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
