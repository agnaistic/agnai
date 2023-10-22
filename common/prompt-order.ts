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

const formatHolders: Record<string, Record<string, string>> = {
  Alpaca: {
    preamble: neat`Below is an instruction that describes a task. Write a response that appropriately completes the request.\n
  Write {{char}}'s next reply in a fictional roleplay chat between {{char}} and {{user}}`,
    history: neat`Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
    
    {{#each msg}}{{#if .isbot}}### Response:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}### Instruction:\n{{.name}}: {{.msg}}{{/if}}
    {{/each}}`,
    post: `### Response:\n{{post}}`,
    system_prompt: `{{#if scenario}}### Instruction:\n{{system_prompt}}{{//if}}`,
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
  Metharme: {
    preamble: neat`Below is an instruction that describes a task. Write a response that appropriately completes the request.\n
  Write {{char}}'s next reply in a fictional roleplay chat between {{char}} and {{user}}`,
    histoy: neat`Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
    
    {{#each msg}}{{#if .isbot}}<|model|>{{/if}}{{#if .isuser}}<|user|>{{/if}}{{.name}}: {{.msg}}
    {{/each}}`,
    post: `<|model|>{{post}}`,
    system_prompt: `{{#if scenario}}<|system|>{{system_prompt}}{//if}}`,
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
  memory: `{{#if memory}}{{char}}'s memories: {{memory}}{{/if}}`,
  ujb: `{{#if ujb}}{{ujb}}{{/if}}`,
  example_dialogue: `{{#if example_dialogue}}How {{char}} speaks:\n{{example_dialogue}}{{/if}}`,
  impersonating: `{{#if impersonating}}{{user}}'s personality: {{impersonating}}{{/if}}`,
  history: `{{history}}`,
  post: `{{post}}`,
}
