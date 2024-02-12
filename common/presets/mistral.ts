import { MISTRAL_MODELS } from '../adapters'; 
import { AppSchema } from '../types/schema';
import { templates } from './templates'

export const mistralPresets = {
  mistral: {
    service: 'mistral',
    name: 'Mistral',
    temp: 0.7, 
    topP: 0.9,  
    mistralModel: MISTRAL_MODELS.MistralSmall, 
    streamResponse: false, 
    maxTokens: 256, 
    maxContextLength: 2048, 
    ignoreCharacterSystemPrompt: false, 
    systemPrompt: `<writing_task>
    Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged).
    </writing_task>`,
    gaslight: templates.Alpaca,
    ultimeJailbreak: '',
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>;