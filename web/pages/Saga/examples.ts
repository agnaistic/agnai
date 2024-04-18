import { neat } from '/common/util'

export type TemplateExampleID = keyof typeof exampleTemplates

export type TemplateExample = {
  name: string
  init: string
  loop: string
  image: string
  history: string
}

const history = neat`<user>{{input}}</user>

<bot>{{response}}</bot>`

export const exampleTemplates = {
  detective: {
    name: 'Detective RPG example',
    image: 'full body shot, selfie, {{image_caption}}, fantasy art, high quality, studio lighting',
    history,
    init: neat`
      Generate the game details for a "detective who-dunnit" RPG.

      First and last name of the main character: "[main_char | temp=0.4 | stop="]"

      First and last name of the main character's partner: "[main_friend | temp=0.4 | stop="]"

      First and last name of the villain of the RPG: "[villain | temp=0.4 | stop="]"

      Where is the main character currently standing?: "[location | tokens=50 | stop=" | temp=0.4]"

      What is the villain's motive for the crime?: "[evil_goal | temp=0.4 | stop="]"

      What is the villian's back story?: "[villain_story | temp=0.4 | stop="]"

      Write the main character's main objective: "Your goal [goal | temp=0.4 | stop="]"

      Write the introduction to the game: "You are [intro | temp=0.4 | stop="]"
      
      Write the opening scene of the game to begin the game: "[scene | temp=0.4 | tokens=300 | stop="]"
      
      Write a brief image caption describing the scene and appearances of the characters: "[image_caption | tokens=200 | stop="]"
      `,
    loop: neat`
      "detective who-dunnit" RPG
  
      The player's main objective for the RPG is "{{goal}}"
      The player's name (the main character) is called "{{main_char}}"
      The name of the main character's partner is "{{main_friend}}"
      The villain of the story is "{{villain}}"
      The villain's back story is "{{villain_story}}"
      The villain's motive for the crime is "{{evil_goal}}"
      The player's location was: "{{location}}"
  
      GAME HISTORY:
      {{scene}}
  
      {{history}}
  
      <user>
      {{main_char}}: {{input}}</user>
  
      Write the next scene with the character's in the scene actions and dialogue.
  
      <bot>
      [response | temp=0.4 | tokens=300 | stop=USER | stop=ASSISTANT | stop=</ | stop=<| | stop=### ]</bot>
  
      <user>
      Write a brief image caption describing the scene and appearances of the characters: "[image_caption | tokens=200 | stop="]"
  
      <user>
      Where is the main character currently standing?</user>
  
      <bot>
      Location: "[location | temp=0.4 | tokens=50 | stop="]"</bot>`,
  },
  open_world: {
    name: 'Open World example',
    image:
      '(anime cartoon:1.5), full body shot, selfie, {{appearance}}, {{image_caption}}, fantasy art, high quality, studio lighting',
    history,
    init: neat`Generate the game details for a "{{title}}" story roleplay RPG
    Background information:
    {{background}}
    
    First name of the main character: "[main_char | temp=0.4 | stop="]"
    
    Brief physical description of {{main_char}}'s appearance (hair style, hair color, body type, eye color): "[appearance | temp=0.5 | stop="]"
    
    First name of the secondary character: "[alt_char | temp=0.4 | stop="]"
    
    Brief description of {{alt_char}}'s personality: "[alt_persona | temp=0.4 | stop="]"
    
    Write the opening scene of the roleplay to begin the RPG: "[scene | temp=0.4 | tokens=300 | stop="]"
    
    Briefly describe the scene as an image caption: "[image_caption | temp=0.5 | stop="]"`,
    loop: neat`"{{title}}" story roleplay RPG
    Background information:
    {{background}}

   The main character is: {{main_char}}.
   {{main_char}}'s physical appearance: {{appearance}}
   
   The secondary character is: {{alt_char}}.
   The secondary character's personality:
   {{alt_persona}}
   
   <user>The opening scene of the roleplay story:
   {{scene}}</user>
   
   And then the story roleplay begins:
   
   {{history}}
   
   <user>{{main_char}}: {{input}}</user>
   
   <bot>
   [response | temp=0.4 | tokens=300 | stop=USER | stop=ASSISTANT | stop=</ | stop=<| | stop=### ]</bot>
   
   <user>`,
  },
} satisfies Record<string, TemplateExample>
