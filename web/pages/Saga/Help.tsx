import { Component } from 'solid-js'
import Modal from '/web/shared/Modal'
import { neat } from '/common/util'
import { markdown } from '/web/shared/markdown'
import { sagaStore } from './state'
import Button from '/web/shared/Button'

export const GuidanceHelp: Component = (props) => {
  const state = sagaStore((s) => ({ show: s.showModal === 'help' }))
  const close = () => sagaStore.setState({ showModal: 'none' })
  return (
    <Modal
      maxWidth="half"
      show={state.show}
      close={close}
      title="Guidance"
      footer={<Button onClick={close}>Close</Button>}
    >
      <div class="rendered-markdown text-sm" innerHTML={markdown.makeHtml(text)}></div>
    </Modal>
  )
}

const text = neat`
**Sagas** use a feature called Guidance. You can use guidance to generate multiple responses in a single request and add constraints to the generation.
For example you can generate:
- Numbers within a specific range
- An option from a list of values
- A true or false (boolean)

Guidance variable format in prompts:
\`\`\`
[name | ...options | type=... ]
\`\`\`

**Options:**
\`tokens=[number]\` E.g. \`tokens=20\`
\`stop=...\` E.g. \`stop=" | stop=### | stop=USER\`
\`temp=[float]\` E.g. \`temp=0.4\` - Defaults to 0.5

**Types:**
Text: \`type=string\` 
- Generate text
- Example: \`[first_name | type=string | tokens=20]\`

Boolean: \`type=boolean\`
- Generate \`true\` or \`false\`
- Example: \`type=boolean\` E.g: \`[is_awake | type=boolean]\`

List: \`type=list listname\`
- The AI can select an item from a list of options
- Example: \`[mood | type=list moods]\`

Number: \`type=number\`
- Generate a number within a range
- Example: \`[health | type=number min=0 max=100]\`

Random: \`type=random listname\`
- Without using AI, select an item from a list of options
- Example \`[character_class | type=random classes]\`

Template Example:
\`\`\`
Write the full name for a person sitting in a cafe:
"[full_name | temp=0.4 | stop="]"

How old is "[full_name]"?:
"[age | type=number min=21 max=65]"

What mood is "[full_name]" in?
"[mood | type=list moods]"

What kind of personality does "[full name]" have?
"[personality | type=list personalities]"

Write the background story for "[full_name]":
"[background | tokens=250 | temp=0.6 | stop=" | stop=### | stop=</ | stop=USER]"
\`\`\`
`
