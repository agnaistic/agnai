import { Component } from 'solid-js'
import Modal from '/web/shared/Modal'
import { neat } from '/common/util'
import { markdown } from '/web/shared/markdown'
import { gameStore } from './state'

export const GuidanceHelp: Component = (props) => {
  return (
    <Modal
      maxWidth="half"
      show
      close={() => gameStore.setState({ showModal: 'none' })}
      title="Guidance"
    >
      <div class="rendered-markdown text-sm" innerHTML={markdown.makeHtml(text)}></div>
    </Modal>
  )
}

const text = neat`
Guidance variable format in prompts:
\`\`\`
[name | ...options | type=... ]
\`\`\`

Options:
\`tokens=[number]\` E.g. \`tokens=20\`
\`stop=...\` E.g. \`stop=" | stop=### | stop=USER\`
\`temp=[float]\` E.g. \`temp=0.4\` - Defaults to 0.5

Types:
\`type=boolean\`
\`type=string\` - If no other type is provided, this is the default
\`type=number min=... max=...\` E.g. \`type=number min=0 max=100\` - Min and max are optional
\`type=list name\` E.g. \`type=list available_moods\`
\`type=random name\` E.g. \`type=random genres\`

Example:
\`\`\`
Write the full name for a person sitting in a cafe:
"[full_name | temp=0.4 | stop="]"

How old is "[full_name]"?:
"[age | type=number min=21 max=65]"

What mood is "[full_name]" in?
"[mood | type=random moods]"

What kind of personality does "[full name]" have?
"[personality | type=list personalities]"

Write the background story for "[full_name]":
"[background | tokens=250 | temp=0.6 | stop=" | stop=### | stop=</ | stop=USER]"
\`\`\`
`
