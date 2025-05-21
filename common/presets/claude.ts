import { AppSchema } from '../types/schema'

/** Note: claude-v1 and claude-instant-v1 not included as they may point
 * to different models in the future. New models may be less appropriate
 * for roleplaying so they should be updated to manually
 * <https://console.anthropic.com/docs/api/reference#-v1-complete>
 */
export const CLAUDE_MODELS = {
  ClaudeV1: 'claude-v1',
  ClaudeV1_0: 'claude-v1.0',
  ClaudeV1_2: 'claude-v1.2',
  ClaudeV1_3: 'claude-v1.3',
  ClaudeV1_100k: 'claude-v1-100k',
  ClaudeV1_3_100k: 'claude-v1.3-100k',

  ClaudeInstantV1: 'claude-instant-v1',
  ClaudeInstantV1_0: 'claude-instant-v1.0',
  ClaudeInstantV1_1: 'claude-instant-v1.1',
  ClaudeInstantV1_100k: 'claude-instant-v1-100k',
  ClaudeInstantV1_1_100k: 'claude-instant-v1.1-100k',

  ClaudeV2: 'claude-2',
  ClaudeV2_0: 'claude-2.0',
  ClaudeV2_1: 'claude-2.1',

  ClaudeV3_Opus: 'claude-3-opus-20240229',
  ClaudeV3_Sonnet: 'claude-3-sonnet-20240229',
  ClaudeV3_Haiku: 'claude-3-haiku-20240307',
  ClaudeV35_Haiku_Oct2024: 'claude-3-5-haiku-20241022',
  ClaudeV35_Haiku_Latest: 'claude-3-5-haiku-latest',
  ClaudeV35_Sonnet: 'claude-3-5-sonnet-20240620',
  ClaudeV35_Sonnet_Oct2024: 'claude-3-5-sonnet-20241022',
  ClaudeV35_Sonnet_Latest: 'claude-3-5-sonnet-latest',
  ClaudeV37_Sonnet_Feb2025: 'claude-3-7-sonnet-20250219',
  ClaudeV37_Sonnet_Latest: 'claude-3-7-sonnet-latest',
} as const

export const CLAUDE_TEXT_MODELS: Record<string, boolean> = {
  [CLAUDE_MODELS.ClaudeV1]: true,
  [CLAUDE_MODELS.ClaudeV1_0]: true,
  [CLAUDE_MODELS.ClaudeV1_2]: true,
  [CLAUDE_MODELS.ClaudeV1_3]: true,
  [CLAUDE_MODELS.ClaudeV1_100k]: true,
  [CLAUDE_MODELS.ClaudeV1_3_100k]: true,

  [CLAUDE_MODELS.ClaudeInstantV1]: true,
  [CLAUDE_MODELS.ClaudeInstantV1_0]: true,
  [CLAUDE_MODELS.ClaudeInstantV1_1]: true,
  [CLAUDE_MODELS.ClaudeInstantV1_100k]: true,
  [CLAUDE_MODELS.ClaudeInstantV1_1_100k]: true,

  [CLAUDE_MODELS.ClaudeV2]: true,
  [CLAUDE_MODELS.ClaudeV2_0]: true,
  [CLAUDE_MODELS.ClaudeV2_1]: true,
}

export const claudePresets = {
  claude: {
    name: 'Claude V3.7 Sonnet',
    service: 'claude',
    temp: 1,
    topP: 1,
    topK: 0,
    claudeModel: 'claude-3-7-sonnet-latest',
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
