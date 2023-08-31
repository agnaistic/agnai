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
  {{post}}
  `,
}
