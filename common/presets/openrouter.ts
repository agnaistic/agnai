import { AppSchema } from '../types/schema'

export const openRouterPresets = {
  openrouter: {
    name: 'OpenRouter',
    service: 'openrouter',
    temp: 0.8,
    streamResponse: true,
    maxTokens: 300,
    maxContextLength: 4095,
    systemPrompt: `Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)`,
    ignoreCharacterSystemPrompt: false,
    ignoreCharacterUjb: false,
    gaslight: `{{system_prompt}}
Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}`,
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
