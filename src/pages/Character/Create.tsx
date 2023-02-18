import { Component, createSignal, For, Show } from 'solid-js'
import { Plus, Save } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { FormLabel } from '../../shared/FormLabel'
import RadioGroup from '../../shared/RadioGroup'
import { getFormEntries, getStrictForm } from '../../shared/util'

const options = [
  { id: 'text', label: 'Plain text', isChecked: true },
  { id: 'json', label: 'JSON' },
  { id: 'wpp', label: 'W++' },
]

const CreateCharacter: Component = () => {
  const onSubmit = (ev: Event) => {
    const body = getStrictForm(ev, { name: 'string', greeting: 'string', schema: 'string' })
    const attributes = getAttributeMap(getFormEntries(ev))
    console.log({ ...body, attributes })
  }

  return (
    <div>
      <PageHeader title="Create a Character" />

      <form class="flex flex-col gap-4" onSubmit={onSubmit}>
        <TextInput
          fieldName="name"
          required
          label="Character Name"
          helperText="The name of your character."
          placeholder=""
        />

        <TextInput
          fieldName="greeting"
          required
          label="Greeting"
          helperText="The first message from your character. It is recommended to provide a lengthy first message to encourage the character to give longer responses."
        />

        <div>
          <FormLabel label="Persona Schema" helperText="Format to use for the character's format" />
          <RadioGroup name="schema" horizontal options={options} />
        </div>

        <JsonSchema show={true} />

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
const JsonSchema: Component<{ show: boolean }> = (props) => {
  const [attrs, setAttrs] = createSignal<Attr[]>([
    { id: ++attrId, key: 'species', values: 'human' },
  ])

  const add = () => setAttrs((prev) => [...prev, { id: ++attrId, key: '', values: '' }])

  return (
    <Show when={props.show}>
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
    <div class="flex flex-row gap-2">
      <div class="w-48">
        <TextInput
          fieldName={`attr-key.${props.attr.id}`}
          placeholder="Attribute name"
          value={props.attr.key}
        />
      </div>
      <div class="w-full">
        <TextInput
          fieldName={`attr-value.${props.attr.id}`}
          placeholder="Comma separate attributues. E.g: tall, brunette, slender"
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

  const values = Object.values(map) as Array<{ key: string; values: string[] }>
  return values
}
