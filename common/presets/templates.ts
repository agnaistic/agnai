import { neat } from '../util'

type TemplateId = keyof typeof templates

export function isDefaultTemplate(id: string): id is TemplateId {
  return id in templates
}

export const TAGS = {
  openUser: /<USER>/gi,
  closeUser: /<\/USER>/gi,
  openBot: /<BOT>/gi,
  closeBot: /<\/BOT>/gi,
  openSystem: /<SYSTEM>/gi,
  closeSystem: /<\/SYSTEM>/gi,
}

export type FormatTags = {
  openUser: string
  closeUser: string
  openBot: string
  closeBot: string
  openSystem: string
  closeSystem: string
}

export type ModelFormat = 'Alpaca' | 'Vicuna' | 'ChatML' | 'Mistral' | 'Llama3' | 'None'

export const BUILTIN_FORMATS: { [key in ModelFormat]: FormatTags } = {
  Alpaca: {
    openUser: '### Instruction:\n',
    closeUser: '\n',
    openBot: '### Response:\n',
    closeBot: '\n',
    openSystem: '### System:\n',
    closeSystem: '\n',
  },
  Vicuna: {
    openUser: 'USER: ',
    closeUser: '\n',
    openBot: 'RESPONSE: ',
    closeBot: '\n',
    openSystem: 'SYSTEM: ',
    closeSystem: '\n',
  },
  ChatML: {
    openUser: '<|im_start|>user\n',
    closeUser: '<|im_end|>',
    openBot: '<|im_start|>assistant\n',
    closeBot: '<|im_end|>',
    openSystem: '<|im_start|>system\n',
    closeSystem: '<|im_end|>',
  },
  Mistral: {
    openUser: `[INST] `,
    closeUser: `[/INST]\n`,
    openBot: '',
    closeBot: ' </s>\n',
    openSystem: '[INST] ',
    closeSystem: ' [/INST]\n',
  },
  Llama3: {
    openSystem: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n`,
    closeSystem: `<|eot_id|>`,
    openUser: `<|start_header_id|>user<|end_header_id|>\n`,
    closeUser: `<|eot_id|>`,
    openBot: `<|start_header_id|>assistant<|end_header_id|>`,
    closeBot: `<|eot_id|>`,
  },
  None: {
    openSystem: '',
    closeSystem: '',
    openUser: '',
    closeUser: '',
    openBot: '',
    closeBot: '',
  },
}

export function replaceTags(prompt: string, format: FormatTags | ModelFormat) {
  if (!format) {
    format = 'Alpaca'
  }

  if (typeof format === 'string' && format in BUILTIN_FORMATS === false) {
    format = 'Alpaca'
  }

  const tags = typeof format === 'string' ? BUILTIN_FORMATS[format] : format
  const keys = Object.keys(TAGS) as Array<keyof typeof TAGS>
  let output = prompt

  for (const name of keys) {
    const regex = TAGS[name]
    output = output.replace(regex, tags[name])
  }

  return output.replace(/\n\n+/g, '\n\n')
}

export const templates = {
  Universal: neat`
<system>{{#if system_prompt}}{{value}}{{else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{user}}" and "{{char}}".{{/else}}{{/if}}</system>

"{{char}}'s" Persona:
{{personality}}

{{#if memory}}"{{char}}'s" Memory:
{{memory}}
{{/if}}
{{#if user_embed}}Relevant information to the conversation
{{user_embed}}
{{/if}}
{{#if scenario}}The scenario of the conversation:
{{scenario}}
{{/if}}
{{#if chat_embed}}Relevant past conversation history
{{chat_embed}}
{{/if}}
{{#if example_dialogue}}This is how "{{char}}" should talk:
{{example_dialogue}}
{{/if}}

Then the roleplay chat between "{{char}}" and "{{user}}" begins.

{{#each msg}}{{#if .isbot}}<bot>{{.name}}: {{.msg}}</bot>{{/if}}{{#if .isuser}}<user>{{.name}}: {{.msg}}</user>{{/if}}
{{/each}}

<bot>{{#if ujb}}({{ujb}}) {{/if}}{{post}}`,
  Alpaca: neat`
{{#if system_prompt}}{{value}}{{else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{user}}" and "{{char}}".{{/else}}
{{/if}}

"{{char}}'s" Persona:
{{personality}}

{{#if memory}}"{{char}}'s" Memory:
{{memory}}
{{/if}}
{{#if user_embed}}Relevant information to the conversation
{{user_embed}}
{{/if}}
{{#if scenario}}The scenario of the conversation: {{scenario}}
{{/if}}
{{#if chat_embed}}Relevant past conversation history
{{chat_embed}}
{{/if}}
{{#if example_dialogue}}This is how "{{char}}" should talk: {{example_dialogue}}
{{/if}}

Then the roleplay chat between "{{char}}" and "{{user}}" begins.

{{#each msg}}{{#if .isbot}}### Response:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}### Instruction:\n{{.name}}: {{.msg}}{{/if}}
{{/each}}

### Response:
{{#if ujb}}({{value}}) {{/if}}{{post}}`,
  Vicuna: neat`
{{#if system_prompt}}{{system_prompt}}{{else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{user}}" and "{{char}}".{{/else}}
{{/if}}
Below is an instruction that describes a task. Write a response that appropriately completes the request.



"{{char}}'s" Persona:
{{personality}}

{{#if memory}}"{{char}}'s" Memories:
{{memory}}
{{/if}}
{{#if scenario}}The scenario of the conversation:
{{scenario}}
{{/if}}
{{#if example_dialogue}}This is how "{{char}}" should talk:
{{example_dialogue}}
{{/if}}

{{#each msg}}{{#if .isbot}}ASSISTANT:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}USER:\n{{.name}}: {{.msg}}{{/if}}
{{/each}}
{{#if ujb}}SYSTEM:{{ujb}}
{{/if}}
ASSISTANT:\n{{post}}`,
  NovelAI: neat`
{{#if system_prompt}}{{system_prompt}}
{{/if}}
{{#if memory}}{{char}}'s Memory:
{{memory}}{{/if}}
Description of {{char}}:
{{personality}}

How {{char}} speaks:
{{example_dialogue}}

[ Title: Dialogue between "{{char}}" and "{{user}}"; Tags: conversation; Genre: online roleplay ]
[ Style: chat ]
***
Summary: {{scenario}}
{{history}}
{{#if ujb}}{ {{value}} }{{/if}}
{{post}}`,
  Pyg: neat`
{{char}}'s Persona:
{{personality}}

{{#if scenario}}Scenario: {{scenario}}
{{/if}}
{{#if memory}}Facts:{{memory}}
{{/if}}
{{#if example_dialogue}}How {{char}} speaks: {{example_dialogue}}
{{/if}}

<START>
{{history}}

{{#if ujb}}{{ujb}
{{/if}}
{{post}}`,
  Metharme: neat`
{{#if system_prompt}}{{system_prompt}}{{else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{user}}" and "{{char}}".{{/else}}{{/if}}

{{char}}'s Persona:
{{personality}}
{{#if memory}}"{{char}}'s" Memory:
{{memory}}
{{/if}}
{{#if scenario}}The scenario of the conversation:
{{scenario}}
{{/if}}
{{#if example_dialogue}}This is how "{{char}}" should talk:
{{example_dialogue}}
{{/if}}

{{#each msg}}{{#if .isbot}}<|model|>{{/if}}{{#if .isuser}}<|user|>{{/if}}{{.name}}: {{.msg}}
{{/each}}
{{#if ujb}}<|system|>{{ujb}}
{{/if}}
<|model|>{{post}}`,
  ChatML: neat`
<|im_start|>system
{{#if system_prompt}}{{system_prompt}}{{else}}Write "{{char}}'s" next reply in a fictional roleplay chat between "{{user}}" and "{{char}}".{{/else}}{{/if}}<|im_end|>

"{{char}}'s" Persona:
{{personality}}

{{#if memory}}"{{char}}'s" Memory: {{memory}}
{{/if}}
{{#if scenario}}The scenario of the conversation: {{scenario}}
{{/if}}
{{#if example_dialogue}}This is how "{{char}}" should talk: {{example_dialogue}}
{{/if}}
Then the roleplay chat begins.<|im_end|>

{{#each msg}}<|im_start|>[{{.name}}]
{{.msg}}<|im_end|>
{{/each}}
<|im_start|>[{{char}}]
{{#if ujb}}({{value}}) {{/if}}{{post}}`,
}
