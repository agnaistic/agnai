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

export type ModelFormat = 'Alpaca' | 'Vicuna' | 'ChatML' | 'Mistral'

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
    closeUser: '<|im_end>',
    openBot: '<|im_start|>assistant\n',
    closeBot: '<|im_end|>',
    openSystem: '<|im_start|>system\n',
    closeSystem: '<|im_end|>',
  },
  Mistral: {
    openUser: `[INST] `,
    closeUser: `[/INST]\n`,
    openBot: '[INST] ',
    closeBot: ' [/INST]\n',
    openSystem: '[INST] ',
    closeSystem: ' [/INST]\n',
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
{{#if system_prompt}}<system>{{system_prompt}}</system>
{{/if}}
Below is an instruction that describes a task. Write a response that appropriately completes the request.

Write {{char}}'s next reply in a fictional roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}}.

{{char}}'s Persona:
{{personality}}

{{#if memory}}{{char}}'s Memory:
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
{{#if example_dialogue}}This is how {{char}} should talk:
{{example_dialogue}}
{{/if}}

Then the roleplay chat between {{char}} and {{user}} begins.

{{#each msg}}{{#if .isbot}}<bot>{{.name}}: {{.msg}}</bot>{{/if}}{{#if .isuser}}<user>{{.name}}: {{.msg}}</user>{{/if}}
{{/each}}
{{#if ujb}}<bot>
{{ujb}}</bot>
{{/if}}
<bot>{{post}}`,
  Alpaca: neat`
{{#if system_prompt}}{{system_prompt}}
{{/if}}
Below is an instruction that describes a task. Write a response that appropriately completes the request.

Write {{char}}'s next reply in a fictional roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}}.

{{char}}'s Persona:
{{personality}}

{{#if memory}}{{char}}'s Memory:
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
{{#if example_dialogue}}This is how {{char}} should talk: {{example_dialogue}}
{{/if}}
***  
{{#each msg}}{{#if .isbot}}### Response:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}### Instruction:\n{{.name}}: {{.msg}}{{/if}}
{{/each}}
{{#if ujb}}### Instruction:
{{ujb}}
{{/if}}
### Response:
  {{post}}`,
  Vicuna: neat`
{{#if system_prompt}}{{system_prompt}}
{{/if}}
Below is an instruction that describes a task. Write a response that appropriately completes the request.

Write {{char}}'s next reply in a fictional roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}}.

{{char}}'s Persona:
{{personality}}

{{#if memory}}{{char}}'s Memories:
{{memory}}
{{/if}}
{{#if scenario}}This scenario of the conversation:
{{scenario}}
{{/if}}
{{#if example_dialogue}}This is how {{char}} should talk:
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

[ Title: Dialogue between {{char}} and {{user}}; Tags: conversation; Genre: online roleplay ]
***
Summary: {{scenario}}
{{history}}
{{ujb}}
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
{{#if system_prompt}}{{system_prompt}}{{/if}}

Below is an instruction that describes a task. Write a response that appropriately completes the request.

Write {{char}}'s next reply in a fictional roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}}.

{{char}}'s Persona:
{{personality}}
{{#if memory}}{{char}}'s Memory:
{{memory}}
{{/if}}
{{#if scenario}}This scenario of the conversation:
{{scenario}}
{{/if}}
{{#if example_dialogue}}This is how {{char}} should talk:
{{example_dialogue}}
{{/if}}

{{#each msg}}{{#if .isbot}}<|model|>{{/if}}{{#if .isuser}}<|user|>{{/if}}{{.name}}: {{.msg}}
{{/each}}
{{#if ujb}}<|system|>{{ujb}}
{{/if}}
<|model|>{{post}}`,
  ChatML: neat`
{{#if system_prompt}}<|im_start|>system
{{system_prompt}}<|im_end|>{{/if}}

<|im_start|>system
Below is an instruction that describes a task. Write a response that appropriately completes the request.<|im_end|>

<|im_start|>system
Write {{char}}'s next reply in a fictional roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}}.

{{char}}'s Persona:
{{personality}}

{{#if memory}}{{char}}'s Memory: {{memory}}
{{/if}}
{{#if scenario}}This scenario of the conversation: {{scenario}}
{{/if}}
{{#if example_dialogue}}This is how {{char}} should talk: {{example_dialogue}}
{{/if}}
Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.<|im_end|>

{{#each msg}}{{#if .isbot}}<|im_start|>assistant{{/if}}{{#if .isuser}}<|im_start|>user{{/if}}
{{.name}}: {{.msg}}<|im_end|>
{{/each}}
{{#if ujb}}<|im_start|>system
{{ujb}}<|im_end|>
{{/if}}
<|im_start|>assistant
{{post}}`,
}
