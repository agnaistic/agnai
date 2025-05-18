import { AppSchema } from '../types/schema'

export const OPENAI_MODELS = {
  DaVinci: 'text-davinci-003',
  Turbo: 'gpt-3.5-turbo',
  Turbo0301: 'gpt-3.5-turbo-0301',
  Turbo0613: 'gpt-3.5-turbo-0613',
  Turbo1106: 'gpt-3.5-turbo-1106',
  Turbo_16k: 'gpt-3.5-turbo-16k',
  Turbo_Instruct: 'gpt-3.5-turbo-instruct',
  Turbo_Intruct914: 'gpt-3.5-turbo-instruct-0914',
  GPT4: 'gpt-4',
  GPT4_0314: 'gpt-4-0314',
  GPT4_0613: 'gpt-4-0613',
  GPT4_32k: 'gpt-4-32k',
  GPT4_32k_0314: 'gpt-4-32k-0314',
  GPT4_32k_0613: 'gpt-4-32k-0613',
  GPT45_1106: 'gpt-4-1106-preview',
  GPT45_0125: 'gpt-4-0125-preview',
  GPT45_Preview: 'gpt-4-turbo-preview',
  GPT4_Turbo_Preview: 'gpt-4-turbo-preview',
  GPT4_Turbo: 'gpt-4-turbo',
  GPT4_Turbo_0409: 'gpt-4-turbo-2024-04-09',
  GPT4_Omni: 'gpt-4o',
  GPT4_Omni_Mini: 'gpt-4o-mini',
  GPT4_Omni_0806: 'gpt-4o-2024-08-06',
  GPT4_Omni_Latest: 'chatgpt-4o-latest',
  O1_Preview: 'o1-preview',
  O1_Preview_20240912: 'o1-preview-2024-09-12',
  O1_Mini: 'o1-mini',
  O1_Mini_20240912: '1-mini-2024-09-12',
} as const

export const OPENAI_CONTEXTS: Record<string, number> = {
  [OPENAI_MODELS.Turbo]: 16300,
  [OPENAI_MODELS.Turbo0613]: 16300,
  [OPENAI_MODELS.Turbo1106]: 16300,
  [OPENAI_MODELS.Turbo_16k]: 16300,
  [OPENAI_MODELS.GPT4]: 8100,
  [OPENAI_MODELS.GPT4_0314]: 8100,
  [OPENAI_MODELS.GPT4_0613]: 8100,
  [OPENAI_MODELS.GPT4_32k]: 32000,
  [OPENAI_MODELS.GPT4_32k_0314]: 32000,
  [OPENAI_MODELS.GPT4_32k_0613]: 32000,
  [OPENAI_MODELS.GPT45_1106]: 128000,
  [OPENAI_MODELS.GPT45_0125]: 128000,
  [OPENAI_MODELS.GPT45_Preview]: 128000,
  [OPENAI_MODELS.GPT4_Turbo_0409]: 128000,
  [OPENAI_MODELS.GPT4_Omni]: 120000,
}

export const OPENAI_CHAT_MODELS: Record<string, boolean> = {
  [OPENAI_MODELS.Turbo]: true,
  [OPENAI_MODELS.Turbo0301]: true,
  [OPENAI_MODELS.Turbo0613]: true,
  [OPENAI_MODELS.Turbo1106]: true,
  [OPENAI_MODELS.Turbo_16k]: true,
  [OPENAI_MODELS.GPT4]: true,
  [OPENAI_MODELS.GPT4_0314]: true,
  [OPENAI_MODELS.GPT4_0613]: true,
  [OPENAI_MODELS.GPT4_32k]: true,
  [OPENAI_MODELS.GPT4_32k_0314]: true,
  [OPENAI_MODELS.GPT4_32k_0613]: true,
  [OPENAI_MODELS.GPT45_1106]: true,
  [OPENAI_MODELS.GPT45_0125]: true,
  [OPENAI_MODELS.GPT45_Preview]: true,
  [OPENAI_MODELS.GPT4_Turbo_0409]: true,
  [OPENAI_MODELS.GPT4_Omni]: true,
  [OPENAI_MODELS.GPT4_Omni_Mini]: true,
  [OPENAI_MODELS.GPT4_Omni_0806]: true,
  [OPENAI_MODELS.GPT4_Omni_Latest]: true,
  [OPENAI_MODELS.O1_Preview]: true,
  [OPENAI_MODELS.O1_Preview_20240912]: true,
  [OPENAI_MODELS.O1_Mini]: true,
  [OPENAI_MODELS.O1_Mini_20240912]: true,
}

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
