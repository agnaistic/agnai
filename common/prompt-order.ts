import { AppSchema } from './types'
import { neat } from './util'

export function promptOrderToTemplate(
  format: string,
  order: NonNullable<AppSchema.GenSettings['promptOrder']>
) {
  const parts: string[] = []
  for (const item of order) {
    const text = formatHolders[format][item.placeholder] || fallbackHolders[item.placeholder]
    if (text) {
      parts.push(text)
    }
  }

  const post = formatHolders[format].post || fallbackHolders.post
  parts.push(post)

  return parts.join('\n\n').trim()
}

const formatHolders: Record<string, Record<string, string>> = {
  Alpaca: {
    history: neat`Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
    
    {{#each msg}}{{#if .isbot}}### Response:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}### Instruction:\n{{.name}}: {{.msg}}{{/if}}
    {{/each}}`,
    post: `### Response:\n{{post}}`,
  },
  Vicuna: {
    history: neat`Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
    
    {{#each msg}}{{#if .isbot}}ASSISTANT:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}USER:\n{{.name}}: {{.msg}}{{/if}}
    {{/each}}`,
    post: `ASSISTANT: {{post}}`,
  },
  Metharme: {
    histoy: neat`Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
    
    {{#each msg}}{{#if .isbot}}<|model|>{{/if}}{{#if .isuser}}<|user|>{{/if}}{{.name}}: {{.msg}}
    {{/each}}`,
    post: `<|model|>{{post}}`,
  },
  'Pyg/Simple:': {
    history: `Start of the conversation:\n\n{{history}}`,
    scenario: `{{#if scenario}}Scenario: {{scenario}}{{/if}}`,
  },
}

const fallbackHolders: Record<string, string> = {
  system_prompt: `{{#if system_prompt}}{{system_prompt}}{{/if}}`,
  scenario: `{{#if scenario}}The scenario of the conversation: {{scenario}}{{/if}}`,
  personality: `{{char}}'s personality: {{personality}}`,
  memory: `{{#if memory}}{{char}}'s memories: {{memory}}{{/if}}`,
  ujb: `{{#if ujb}}{{ujb}}{{/if}}`,
  example_dialogue: `{{#if example_dialogue}}How {{char}} speaks:\n{{example_dialogue}}{{/if}}`,
  impersonating: `{{#if impersonating}}{{user}}'s personality: {{impersonating}}{{/if}}`,
  history: `{{history}}`,
  post: `{{post}}`,
}
