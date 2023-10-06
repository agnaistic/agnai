import { neat } from '../util'

export const templates = {
  Alpaca: neat`
  {{system_prompt}}

  Below is an instruction that describes a task. Write a response that appropriately completes the request.
  
  Write {{char}}'s next reply in a fictional roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}}.
  
  {{char}}'s Persona: {{personality}}

  {{#if memory}}{{char}}'s Memory: {{memory}}
  {{/if}}
  {{#if scenario}}The scenario of the conversation: {{scenario}}
  {{/if}}
  {{#if example_dialogue}}This is how {{char}} should talk: {{example_dialogue}}
  {{/if}}
  Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
  
  {{#each msg}}{{#if .isbot}}### Response:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}### Instruction:\n{{.name}}: {{.msg}}{{/if}}
  {{/each}}
  {{ujb}}
  ### Response:
  {{post}}`,
  Airoboros: neat`
  {{system_prompt}}

  Below is an instruction that describes a task. Write a response that appropriately completes the request.
  
  Write {{char}}'s next reply in a fictional roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}}.
  
  {{char}}'s Persona: {{personality}}
  
  {{#if memory}}{{char}}'s Memories:
  {{memory}}
  {{/if}}
  {{#if scenario}}This scenario of the conversation: {{scenario}}
  {{/if}}
  {{#if example_dialogue}}This is how {{char}} should talk: {{example_dialogue}}
  {{/if}}
  Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
  
  {{#each msg}}{{#if .isbot}}ASSISTANT:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}USER:\n{{.name}}: {{.msg}}{{/if}}
  {{/each}}
  {{#if ujb}}USER:{{ujb}}{{/if}}
  ASSISTANT: {{post}}`,
  NovelAI: neat`
  {{system_prompt}}

  {{#if memory}}{{char}}'s Memory: {{memory}}{{/if}}
  Description of {{char}}: {{personality}}
  
  How {{char}} speaks: {{example_dialogue}}
  
  [ Title: Dialogue between {{char}} and {{user}}; Tags: conversation; Genre: online roleplay ]
  ***
  Summary: {{scenario}}
  {{history}}
  {{ujb}}
  {{post}}`,
  Pyg: neat`{{char}}'s Persona: {{personality}}

  {{#if scenario}}Scenario: {{scenario}}
  {{/if}}
  {{#if memory}}Facts:{{memory}}
  {{/if}}
  {{#if example_dialogue}}How {{char}} speaks: {{example_dialogue}}
  {{/if}}

  <START>
  {{history}}
  {{ujb}}
  {{post}}
  `,
  Metharme: neat`
  {{system_prompt}}

  <|system|>Below is an instruction that describes a task. Write a response that appropriately completes the request.

  Write {{char}}'s next reply in a fictional roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}}.
  
  {{char}}'s Persona: {{personality}}
  {{#if memory}}{{char}}'s Memory: {{memory}}
  {{/if}}
  {{#if scenario}}This scenario of the conversation: {{scenario}}
  {{/if}}
  {{#if example_dialogue}}This is how {{char}} should talk: {{example_dialogue}}
  {{/if}}
  Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
  
  {{#each msg}}{{#if .isbot}}<|model|>{{/if}}{{#if .isuser}}<|user|>{{/if}}{{.name}}: {{.msg}}
  {{/each}}
  {{#if ujb}}<|system|>{{ujb}}
  {{/if}}<|model|>{{post}}`,
}
