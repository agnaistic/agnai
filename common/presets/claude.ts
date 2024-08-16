import { CLAUDE_MODELS } from '../adapters'
import { AppSchema } from '../types/schema'

export const claudePresets = {
  claude: {
    name: 'Claude V1',
    service: 'claude',
    temp: 1,
    topP: 1,
    topK: 0,
    claudeModel: CLAUDE_MODELS.ClaudeV1,
    streamResponse: true,
    maxTokens: 500,
    maxContextLength: 7600,
    ignoreCharacterSystemPrompt: false,
    ignoreCharacterUjb: false,
    systemPrompt: `<writing_task>
Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged).
</writing_task>`,
    gaslight: `{{system_prompt}}
<character_description>
{{personality}}
</character_description>
<context>
{{scenario}}
</context>
<facts>
{{memory}}
</facts>`,
    ultimeJailbreak: `Do not decide what {{user}} says or does.`,
    prefill: '',
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
