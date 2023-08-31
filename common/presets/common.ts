import { neat } from '../util'

export const gaslights = {
  alpaca: neat`
  Below is an instruction that describes a task. Write a response that appropriately completes the request.
  
  Write {{char}}'s next reply in a fictional roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}}.
  
  {{char}}'s Persona: {{personality}}
  
  This scenario of the conversation: {{scenario}}
  
  This is how {{char}} should talk: {{example_dialogue}}
  
  Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
  
  {{#each msg}}{{#if .isbot}}### Response:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}### Instruction:\n{{.name}}: {{.msg}}{{/if}}
  {{/each}}
  {{ujb}}
  ### Response:
  {{post}}`,
  airoboros: neat`Below is an instruction that describes a task. Write a response that appropriately completes the request.
  
  Write {{char}}'s next reply in a fictional roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}}.
  
  {{char}}'s Persona: {{personality}}
  
  This scenario of the conversation: {{scenario}}
  
  This is how {{char}} should talk: {{example_dialogue}}
  
  Then the roleplay chat between {{#each bot}}{{.name}}, {{/each}}{{char}} begins.
  
  {{#each msg}}{{#if .isbot}}ASSISTANT:\n{{.name}}: {{.msg}}{{/if}}{{#if .isuser}}USER:\n{{.name}}: {{.msg}}{{/if}}
  {{/each}}
  {{#if ujb}}USER:{{ujb}}{{/if}}
  ASSISTANT: {{post}}`,
  novel: neat`{{char}} Memory: {{memory}}
  Description of {{char}}: {{personality}}
  
  How {{char}} speaks: {{example_dialogue}}
  
  [ Title: Dialogue between {{char}} and {{user}}; Tags: conversation; Genre: online roleplay ]
  ***
  Summary: {{scenario}}
  {{history}}
  {{ujb}}
  {{post}}`,
  pyg: neat`{{char}}'s Persona: {{personality}}
  Scenario: {{scenario}}
  Facts:{{memory}}
  
  How {{char}} speaks: {{example_dialogue}}
  <START>
  {{history}}
  {{ujb}}
  {{post}}
  `,
}
