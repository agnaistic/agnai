import { Component, createSignal, For, Show } from 'solid-js'
import { Plus, Save } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { FormLabel } from '../../shared/FormLabel'
import RadioGroup from '../../shared/RadioGroup'
import { getFormEntries, getStrictForm } from '../../shared/util'
import { AppSchema } from '../../../server/db/schema'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import { chatStore } from '../../store'

const options = [
  { id: 'wpp', label: 'W++', isChecked: true },
  { id: 'sbf', label: 'SBF' },
  { id: 'json', label: 'JSON' },
  { id: 'text', label: 'Plain text' },
]

const CreateCharacter: Component = () => {
  const [avatar, setAvatar] = createSignal<string | undefined>(undefined)

  const updateFile = (files: FileInputResult[]) => {
    if (!files.length) setAvatar()
    else setAvatar(files[0].content)
  }

  const onSubmit = (ev: Event) => {
    const body = getStrictForm(ev, {
      kind: 'string',
      name: 'string',
      greeting: 'string',
      scenario: 'string',
      sampleChat: 'string',
    })
    const attributes = getAttributeMap(getFormEntries(ev))
    const persona = {
      kind: body.kind,
      attributes,
    } as any as AppSchema.CharacterPersona
    chatStore.createCharacter({
      name: body.name,
      scenario: body.scenario,
      avatar: avatar(),
      greeting: body.greeting,
      sampleChat: body.sampleChat,
      persona,
    })
  }

  return (
    <div>
      <PageHeader
        title="Create a Character"
        subtitle={
          <span>
            For character information tips and information visit{' '}
            <a
              class="text-purple-500"
              href="https://rentry.org/pygtips#character-creation-tips"
              target="_blank"
            >
              https://rentry.org/pygtips#character-creation-tips
            </a>
          </span>
        }
      />

      <form class="flex flex-col gap-4" onSubmit={onSubmit}>
        <TextInput
          fieldName="name"
          required
          label="Character Name"
          helperText="The name of your character."
          placeholder=""
        />

        <FileInput
          fieldName="avatar"
          label="Avatar"
          accept="image/png,image/jpeg"
          onUpdate={updateFile}
        />

        <TextInput
          fieldName="scenario"
          label="Scenario"
          helperText="The current circumstances and context of the conversation and the characters."
        />

        <TextInput
          isMultiline
          fieldName="greeting"
          label="Greeting"
          helperText="The first message from your character. It is recommended to provide a lengthy first message to encourage the character to give longer responses."
        />

        <div>
          <FormLabel label="Persona Schema" helperText="Format to use for the character's format" />
          <RadioGroup name="kind" horizontal options={options} />
        </div>

        <PersonaAttributes show={true} />

        <TextInput
          isMultiline
          fieldName="sampleChat"
          label="Sample Conversation"
          helperText={
            <span>
              Example chat between you and the character. This section is very important for
              informing the model how your character should speak.
            </span>
          }
          placeholder="You: Hello\n{{char}}: *smiles* Hello!"
        />

        <div class="flex justify-end">
          <Button type="submit">
            <Save />
            Create
          </Button>
        </div>
      </form>
    </div>
  )
}

type Attr = { id: number; key: string; values: string }

let attrId = 0
const PersonaAttributes: Component<{ show: boolean }> = (props) => {
  const [attrs, setAttrs] = createSignal<Attr[]>([
    { id: ++attrId, key: 'species', values: 'human' },
  ])

  const add = () => setAttrs((prev) => [...prev, { id: ++attrId, key: '', values: '' }])

  return (
    <Show when={props.show}>
      <FormLabel
        label="Persona Attributes"
        helperText={
          <span>
            The attributes of your persona. See the link at the top of the page for more
            information.
            <br />
            It is highly recommended to always include the attributes <b>mind</b> and{' '}
            <b>personality</b>.<br />
            Example attributes: mind, personality, gender, appearance, likes, dislikes.
          </span>
        }
      />
      <div>
        <Button onClick={add}>
          <Plus />
          Add Attribute
        </Button>
      </div>
      <div class="flex w-full flex-col gap-2">
        <For each={attrs()}>{(attr) => <Attribute attr={attr} />}</For>
      </div>
    </Show>
  )
}

const Attribute: Component<{ attr: Attr }> = (props) => {
  return (
    <div class="flex w-full gap-2">
      <div class="w-3/12">
        <TextInput
          fieldName={`attr-key.${props.attr.id}`}
          placeholder="Name. E.g. appearance"
          value={props.attr.key}
        />
      </div>
      <div class="w-9/12">
        <TextInput
          fieldName={`attr-value.${props.attr.id}`}
          placeholder="Comma separate attributes. E.g: tall, brunette, athletic"
          value={props.attr.values}
        />
      </div>
    </div>
  )
}

export default CreateCharacter

function getAttributeMap(entries: Array<[string, string]>) {
  const map: any = {}
  for (const [key, value] of entries) {
    if (key.startsWith('attr-key')) {
      const id = key.replace('attr-key.', '')
      if (!map[id]) map[id] = {}
      map[id].key = value
    }

    if (key.startsWith('attr-value')) {
      const id = key.replace('attr-value.', '')
      if (!map[id]) map[id] = {}
      map[id].values = value
        .split(',')
        .map((i) => i.trim())
        .filter((i) => !!i)
    }
  }

  const values = Object.values(map).reduce<Record<string, string[]>>((prev: any, curr: any) => {
    if (!curr.values || !curr.values.length) return prev
    prev[curr.key] = curr.values
    return prev
  }, {})
  return values
}
