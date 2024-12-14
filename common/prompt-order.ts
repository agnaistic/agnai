import { AppSchema } from './types'
import { neat } from './util'

export type OrderOptions = {
  format?: string
  order?: NonNullable<AppSchema.GenSettings['promptOrder']>
  gen?: AppSchema.UserGenPreset
  char?: AppSchema.Character
}

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

export function promptOrderToSections(opts: OrderOptions) {
  const order = (opts.order || SIMPLE_ORDER).filter(
    (o) =>
      o.placeholder !== 'system_prompt' &&
      o.placeholder !== 'ujb' &&
      o.placeholder !== 'post' &&
      o.placeholder !== 'history' &&
      o.enabled
  )
  const holders = opts.format
    ? formatHolders[opts.format] || formatHolders.Universal
    : formatHolders.Universal

  const system = holders.system_prompt || holders.system
  const defs = order.map((o) => getOrderHolder(opts.format!, o.placeholder)).join('\n')
  const history = holders.history
  const post = holders.post

  return {
    system,
    defs: `<user>${defs}</user>`,
    history,
    post,
  }
}

// export function promptOrderToMessages(opts: OrderOptions) {
//   const sections = promptOrderToSections(opts)

//   return [
//     { role: 'system', content: sections.system },
//     { role: 'user', content: sections.defs },

//   ]
// }

function getOrderHolder(format: string, holder: string) {
  return formatHolders[format]?.[holder] || formatHolders.Universal[holder] || ''
}

export const SIMPLE_ORDER: NonNullable<AppSchema.GenSettings['promptOrder']> = [
  'system_prompt',
  'scenario',
  'personality',
  'chat_embed',
  'memory',
  'example_dialogue',
  'history',
].map((placeholder) => ({ placeholder, enabled: true }))

export const formatHolders: Record<string, Record<string, string>> = {
  Universal: {
    system_prompt: neat`<system>{{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}}`,
    scenario: neat`{{#if scenario}}The scenario of the conversation:\n{{scenario}}\n{{/if}}`,
    memory: neat`{{#if memory}}"{{char}}'s" memories:\n{{memory}}\n{{/if}}`,
    personality: neat`{{#if personality}}{{char}}'s personality:\n{{personality}}\n{{/if}}`,
    impersonating: neat`{{#if impersonating}}{{user}}'s personality:\n{{impersonating}}\n{{/if}}`,
    chat_embed: neat`{{#if chat_embed}}Relevant past conversation history:\n{{chat_embed}}\n{{/if}}`,
    example_dialogue: neat`{{#if example_dialogue}}How "{{char}}" speaks:\n{{example_dialogue}}\n{{/if}}`,
    history: neat`Then the roleplay chat between {{user}} and {{char}} begins.</system>
    
    {{#each msg}}{{#if .isbot}}<bot>{{/if}}{{#if .isuser}}<user>{{/if}}{{.name}}: {{.msg}}{{#if .isbot}}</bot>{{/if}}{{#if .isuser}}</user>{{/if}}{{/each}}`,
    post: neat`<bot>{{#if ujb}}({{value}}) {{/if}}{{post}}`,
  },
  Alpaca: {
    system_prompt: `### System:\n{{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}}`,
    history: neat`Then the roleplay chat between "{{user}}" and "{{char}}" begins.
    
    {{#each msg}}{{#if .isbot}}### Response:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}### Instruction:\n{{.name}}: {{.msg}}{{/if}}
    {{/each}}`,
    post: `### Response:\n{{#if ujb}}({{value}}) {{/if}}{{post}}`,
  },
  Vicuna: {
    system_prompt: neat`{{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}}`,
    history: neat`Then the roleplay chat between "{{user}}" and "{{char}}" begins.
    
    {{#each msg}}{{#if .isbot}}ASSISTANT:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}USER:\n{{.name}}: {{.msg}}{{/if}}
    {{/each}}`,
    post: `ASSISTANT: {{#if ujb}}({{value}}) {{/if}}{{post}}`,
  },
  Mistral: {
    system_prompt: neat`[INST] {{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}} [/INST]`,
    history: neat`Then the roleplay chat between "{{user}}" and "{{char}}" begins.
    
    {{#each msg}}{{#if .isbot}}\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}[INST] {{.name}}: {{.msg}} [/INST]{{/if}}
    {{/each}}`,
    post: `{{#if ujb}}({{value}}) {{/if}}{{post}}`,
  },
  Metharme: {
    system_prompt: `<|system|>{{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}}`,
    history: neat`Then the roleplay chat between "{{user}}" and "{{char}}" begins.
    
    {{#each msg}}{{#if .isbot}}<|model|>{{/if}}{{#if .isuser}}<|user|>{{/if}}{{.name}}: {{.msg}}
    {{/each}}`,
    post: `<|model|>{{#if ujb}}({{value}}) {{/if}}{{post}}`,
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
    
    {{#each msg}}<|im_start|>{{#if .isbot}}assistant{{/if}}{{#if .isuser}}user{{/if}}\n{{.name}}: {{.msg}}<|im_end|>{{/each}}`,
    post: neat`<|im_start|>assistant
    {{#if ujb}}({{value}}) {{/if}}{{post}}`,
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
    
    {{#each msg}}<|start_header_id|>{{#if .isbot}}assistant{{/if}}{{#if .isuser}}user{{/if}}{{.name}}: {{.msg}}<|eot_id|>{{/each}}`,
    post: neat`<|start_header_id|>assistant
    {{#if ujb}}({{value}}) {{/if}}{{post}}`,
  },
  'Pyg/Simple': {
    history: `Start of the conversation:\n\n{{history}}`,
    scenario: `{{#if scenario}}Scenario: {{scenario}}{{/if}}`,
  },
}

// const fallbackHolders: Record<string, string> = {
//   system_prompt: neat`{{#if system_prompt}}{{value}}{{#else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{char}}" and "{{user}}"{{/else}}{{/if}}`,
//   scenario: `{{#if scenario}}The scenario of the conversation:\n{{scenario}}\n{{/if}}`,
//   personality: `{{#if personality}}"{{char}}'s" personality:\n{{personality}}\n{{/if}}`,
//   memory: `{{#if memory}}"{{char}}'s" memories:\n{{memory}}\n{{/if}}`,
//   ujb: `{{#if ujb}}({{ujb}}) {{/if}}`,
//   example_dialogue: `{{#if example_dialogue}}How "{{char}}" speaks:\n{{example_dialogue}}\n{{/if}}`,
//   impersonating: `{{#if impersonating}}"{{user}}'s" personality:\n{{impersonating}}\n{{/if}}`,
//   history: `{{history}}`,
//   post: `{{post}}`,
//   chat_embed: `{{#if chat_embed}}Relevant past conversation history:\n{{chat_embed}}\n{{/if}}`,
//   user_embed: `{{#if user_embed}}Relevant information to the conversation:\n{{user_embed}}\n{{/if}}`,
// }
