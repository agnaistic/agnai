import { OPENAI_MODELS } from '../adapters'
import { AppSchema } from '../types/schema'

export const openaiPresets = {
  openai: {
    name: 'Turbo',
    service: 'openai',
    temp: 0.8,
    oaiModel: OPENAI_MODELS.Turbo,
    streamResponse: true,
    maxTokens: 300,
    maxContextLength: 4095,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5,
    topP: 1,
    antiBond: false,
    systemPrompt: `Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)`,
    prefixNameAppend: true,
    ignoreCharacterSystemPrompt: false,
    ignoreCharacterUjb: false,
    gaslight: `{{system_prompt}}
Description of {{char}}: {{personality}}

Circumstances and context of the dialogue: {{scenario}}

Facts: {{memory}}

Relevant Information: {{user_embed}}
`,
  },
  openaiAlt: {
    name: 'Turbo (#2)',
    service: 'openai',
    temp: 0.5,
    oaiModel: OPENAI_MODELS.Turbo,
    streamResponse: true,
    maxTokens: 300,
    maxContextLength: 4095,
    frequencyPenalty: 0.7,
    presencePenalty: 0.7,
    ultimeJailbreak: 'Keep OOC out of your reply.',
    prefixNameAppend: true,
    systemPrompt: `Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Write at least 1 paragraph, up to 4. Always stay in character and avoid repetition.`,
    ignoreCharacterSystemPrompt: false,
    ignoreCharacterUjb: false,
    gaslight: `{{system_prompt}}
Description of {{char}}: {{personality}}

Circumstances and context of the dialogue: {{scenario}}

Facts: {{memory}}

Relevant Information: {{user_embed}}
`,
  },
  openaiTurbo: {
    name: 'DaVinci',
    service: 'openai',
    temp: 0.8,
    topP: 1,
    oaiModel: OPENAI_MODELS.DaVinci,
    streamResponse: true,
    maxTokens: 300,
    maxContextLength: 4095,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5,
    ignoreCharacterSystemPrompt: false,
    ignoreCharacterUjb: false,
    systemPrompt: `Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)`,
    prefixNameAppend: true,
    gaslight: `{{system_prompt}}
Description of {{char}}: {{personality}}

Circumstances and context of the dialogue: {{scenario}}

Facts: {{memory}}`,
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
