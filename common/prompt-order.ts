import { AppSchema } from './types'
import { neat } from './util'

export function promptOrderToTemplate(
  format: string,
  order: NonNullable<AppSchema.GenSettings['promptOrder']>
) {
  const parts: string[] = []
  const preamble = getOrderHolder(format, 'preamble')
  if (preamble) parts.push(preamble)

  for (const item of order) {
    if (!item.enabled) continue

    const text = getOrderHolder(format, item.placeholder)
    if (text) {
      parts.push(text)
    }
  }

  const post = getOrderHolder(format, 'post')
  if (post) parts.push(post)

  return parts
    .filter((p) => !!p)
    .join('\n\n')
    .trim()
}

function getOrderHolder(format: string, holder: string) {
  return formatHolders[format]?.[holder] || fallbackHolders[holder] || ''
}

export const formatHolders: Record<string, Record<string, string>> = {
  Alpaca: {
    system_prompt: `### System:\n{{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}}`,
    history: neat`Then the roleplay chat between "{{user}}" and "{{char}}" begins.
    
    {{#each msg}}{{#if .isbot}}### Response:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}### Instruction:\n{{.name}}: {{.msg}}{{/if}}
    {{/each}}`,
    post: `### Response:\n{{post}}`,
    ujb: `{{#if ujb}}({{ujb}}){{/if}}`,
  },
  Vicuna: {
    system_prompt: neat`{{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}}`,
    history: neat`Then the roleplay chat between "{{user}}" and "{{char}}" begins.
    
    {{#each msg}}{{#if .isbot}}ASSISTANT:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}USER:\n{{.name}}: {{.msg}}{{/if}}
    {{/each}}`,
    post: `ASSISTANT: {{post}}`,
    ujb: `{{#if ujb}}({{ujb}}){{/if}}`,
  },
  Mistral: {
    system_prompt: neat`[INST] {{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}} [/INST]`,
    history: neat`Then the roleplay chat between "{{user}}" and "{{char}}" begins.
    
    {{#each msg}}{{#if .isbot}}\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}[INST] {{.name}}: {{.msg}} [/INST]{{/if}}
    {{/each}}`,
    post: `{{post}}`,
    ujb: `{{#if ujb}}[INST] {{ujb}} [/INST]{{/if}}`,
  },
  Metharme: {
    system_prompt: `<|system|>{{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}}`,
    history: neat`Then the roleplay chat between "{{user}}" and "{{char}}" begins.
    
    {{#each msg}}{{#if .isbot}}<|model|>{{/if}}{{#if .isuser}}<|user|>{{/if}}{{.name}}: {{.msg}}
    {{/each}}`,
    post: `<|model|>{{post}}`,
  },
  ChatML: {
    system_prompt: neat`<|im_start|>system
    {{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}}<|im_end|>`,
    scenario: neat`{{#if scenario}}The scenario of the conversation:\n{{scenario}}\n{{/if}}`,
    memory: neat`{{#if memory}}"{{char}}'s" memories:\n{{memory}}\n{{/if}}`,
    personality: neat`{{#if personality}}{{char}}'s personality:\n{{personality}}\n{{/if}}`,
    impersonating: neat`{{#if impersonating}}{{user}}'s personality:\n{{impersonating}}\n{{/if}}`,
    chat_embed: neat`{{#if chat_embed}}Relevant past conversation history:\n{{chat_embed}}\n{{/if}}`,
    example_dialogue: neat`{{#if example_dialogue}}How "{{char}}" speaks:\n{{example_dialogue}}\n{{/if}}`,
    history: neat`Then the roleplay chat between {{user}} and {{char}} begins.
    
    {{#each msg}}<|im_start|>{{#if .isbot}}assistant{{/if}}{{#if .isuser}}user{{/if}}
    {{.name}}: {{.msg}}<|im_end|>{{/each}}`,
    post: neat`<|im_start|>assistant
    {{post}}`,
    ujb: neat`{{#if ujb}}<|im_start|>system
    {{ujb}}<|im_end|>{{/if}}`,
  },
  Llama3: {
    system_prompt: neat`<|begin_of_text|><|start_header_id|>system
    {{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}}<|eot_id|>`,
    scenario: neat`{{#if scenario}}The scenario of the conversation:\n{{scenario}}\n{{/if}}`,
    memory: neat`{{#if memory}}"{{char}}'s" memories:\n{{memory}}\n{{/if}}`,
    personality: neat`{{#if personality}}"{{char}}'s" personality:\n{{personality}}\n{{/if}}`,
    impersonating: neat`{{#if impersonating}}"{{user}}'s" personality:\n{{impersonating}}\n{{/if}}`,
    chat_embed: neat`{{#if chat_embed}}Relevant past conversation history:\n{{chat_embed}}\n{{/if}}`,
    example_dialogue: neat`{{#if example_dialogue}}How "{{char}}" speaks:\n{{example_dialogue}}\n{{/if}}`,
    history: neat`Then the roleplay chat between "{{user}}" and "{{char}}" begins.
    
    {{#each msg}}<|start_header_id|>{{#if .isbot}}assistant{{/if}}{{#if .isuser}}user{{/if}}
    {{.name}}: {{.msg}}<|eot_id|>{{/each}}`,
    post: neat`<|start_header_id|>assistant
    {{post}}`,
    ujb: neat`{{#if ujb}}<|im_start|>system
    {{ujb}}<|im_end|>{{/if}}`,
  },
  'Pyg/Simple:': {
    history: `Start of the conversation:\n\n{{history}}`,
    scenario: `{{#if scenario}}Scenario: {{scenario}}{{/if}}`,
  },
}

const fallbackHolders: Record<string, string> = {
  system_prompt: neat`{{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}}`,
  scenario: `{{#if scenario}}The scenario of the conversation:\n{{scenario}}\n{{/if}}`,
  personality: `{{#if personality}}"{{char}}'s" personality:\n{{personality}}\n{{/if}}`,
  memory: `{{#if memory}}"{{char}}'s" memories:\n{{memory}}\n{{/if}}`,
  ujb: `{{#if ujb}}({{ujb}}) {{/if}}`,
  example_dialogue: `{{#if example_dialogue}}How "{{char}}" speaks:\n{{example_dialogue}}\n{{/if}}`,
  impersonating: `{{#if impersonating}}"{{user}}'s" personality:\n{{impersonating}}\n{{/if}}`,
  history: `{{history}}`,
  post: `{{post}}`,
  chat_embed: `{{#if chat_embed}}Relevant past conversation history:\n{{chat_embed}}\n{{/if}}`,
  user_embed: `{{#if user_embed}}Relevant information to the conversation:\n{{user_embed}}\n{{/if}}`,
}
