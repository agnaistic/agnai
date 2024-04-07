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
    preamble: neat`Below is an instruction that describes a task. Write a response that appropriately completes the request.\n
  Write {{char}}'s next reply in a fictional roleplay chat between {{char}} and {{user}}`,
    history: neat`Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
    
    {{#each msg}}{{#if .isbot}}### Response:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}### Instruction:\n{{.name}}: {{.msg}}{{/if}}
    {{/each}}`,
    post: `### Response:\n{{post}}`,
    system_prompt: `{{#if system_prompt}}### Instruction:\n{{system_prompt}}{{/if}}`,
  },
  Vicuna: {
    preamble: neat`Below is an instruction that describes a task. Write a response that appropriately completes the request.\n
  Write {{char}}'s next reply in a fictional roleplay chat between {{char}} and {{user}}`,
    history: neat`Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
    
    {{#each msg}}{{#if .isbot}}ASSISTANT:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}USER:\n{{.name}}: {{.msg}}{{/if}}
    {{/each}}`,
    post: `ASSISTANT: {{post}}`,
    system_prompt: `{{#if system_prompt}}SYSTEM: {{system_prompt}}{{/if}}`,
  },
  Mistral: {
    preamble: neat`Below is an instruction that describes a task. Write a response that appropriately completes the request.\n
  Write {{char}}'s next reply in a fictional roleplay chat between {{char}} and {{user}}`,
    history: neat`Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
    
    {{#each msg}}{{#if .isbot}}\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}[INST] {{.name}}: {{.msg}} [/INST]{{/if}}
    {{/each}}`,
    post: `{{post}}`,
    system_prompt: `{{#if system_prompt}}[INST] {{system_prompt}} [/INST]{{/if}}`,
    ujb: `{{#if ujb}}[INST] {{ujb}} [/INST]{{/if}}`,
  },
  Metharme: {
    preamble: neat`Below is an instruction that describes a task. Write a response that appropriately completes the request.\n
  Write {{char}}'s next reply in a fictional roleplay chat between {{char}} and {{user}}`,
    history: neat`Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
    
    {{#each msg}}{{#if .isbot}}<|model|>{{/if}}{{#if .isuser}}<|user|>{{/if}}{{.name}}: {{.msg}}
    {{/each}}`,
    post: `<|model|>{{post}}`,
    system_prompt: `{{#if system_prompt}}<|system|>{{system_prompt}}{{/if}}`,
  },
  ChatML: {
    preamble: neat`<|im_start|>system
    Below is an instruction that describes a task. Write a response that appropriately completes the request.\n
    Write {{char}}'s next reply in a fictional roleplay chat between {{char}} and {{user}}<|im_end|>`,
    scenario: neat`{{#if scenario}}<|im_start|>system
    The scenario of the conversation: {{scenario}}<|im_end|>{{/if}}`,
    memory: neat`{{#if memory}}<|im_start|>system
    {{char}}'s memories:
    {{memory}}<|im_end|>{{/if}}`,
    personality: neat`{{#if personality}}<|im_start|>system
  {{char}}'s personality:\n{{personality}}<|im_end|>{{/if}}`,
    impersonating: neat`{{#if impersonating}}<|im_start|>system
  {{user}}'s personality:\n{{impersonating}}<|im_end|>{{/if}}`,
    chat_embed: neat`{{#if chat_embed}}<|im_start|>system
  Relevant past conversation history
  {{chat_embed}}<|im_end|>{{/if}}`,
    example_dialogue: neat`{{#if example_dialogue}}<|im_start|>system
  How {{char}} speaks:
  {{example_dialogue}}<|im_end|>{{/if}}`,
    history: neat`<|im_start|>system
    Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.<|im_end|>
    
    {{#each msg}}{{#if .isbot}}<|im_start|>assistant{{/if}}{{#if .isuser}}<|im_start|>user{{/if}}
  {{.name}}: {{.msg}}<|im_end|>
  {{/each}}`,
    post: neat`<|im_start|>assistant
    {{post}}`,
    system_prompt: neat`{{#if system_prompt}}<|im_start|>system
    {{system_prompt}}<|im_end|>{{/if}}`,
    ujb: neat`{{#if ujb}}<|im_start|>system
    {{ujb}}<|im_end|>{{/if}}`,
  },
  'Pyg/Simple:': {
    preamble: '',
    history: `Start of the conversation:\n\n{{history}}`,
    scenario: `{{#if scenario}}Scenario: {{scenario}}{{/if}}`,
  },
}

const fallbackHolders: Record<string, string> = {
  system_prompt: `{{#if system_prompt}}{{system_prompt}}{{/if}}`,
  scenario: `{{#if scenario}}The scenario of the conversation: {{scenario}}{{/if}}`,
  personality: `{{#if personality}}{{char}}'s personality:\n{{personality}}{{/if}}`,
  memory: `{{#if memory}}{{char}}'s memories:\n{{memory}}{{/if}}`,
  ujb: `{{#if ujb}}{{ujb}}{{/if}}`,
  example_dialogue: `{{#if example_dialogue}}How {{char}} speaks:\n{{example_dialogue}}{{/if}}`,
  impersonating: `{{#if impersonating}}{{user}}'s personality:
  {{impersonating}}{{/if}}`,
  history: `{{history}}`,
  post: `{{post}}`,
  chat_embed: `{{#if chat_embed}}Relevant past conversation history
  {{chat_embed}}
  {{/if}}`,
  user_embed: `{{#if user_embed}}Relevant information to the conversation
  {{user_embed}}
  {{/if}}`,
}
