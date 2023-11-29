import { neat } from '../util'

type TemplateId = keyof typeof templates

export function isDefaultTemplate(id: string): id is TemplateId {
  return id in templates
}

export const templates = {
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
  ***
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
  Pyg: neat`{{char}}'s Persona:
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
  {{post}}
  `,
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
  ***
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
