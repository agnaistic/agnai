import { Plus } from 'lucide-solid'
import { Component, createSignal, For, Show } from 'solid-js'
import Button from '../../shared/Button'
import { FormLabel } from '../../shared/FormLabel'
import TextInput from '../../shared/TextInput'

type Attr = { key: string; values: string }

const defaultAttrs = [
  { key: 'species', values: 'human' },
  { key: 'mind', values: '' },
  { key: 'personality', values: '' },
]

const PersonaAttributes: Component<{ value?: Record<string, string[]> }> = (props) => {
  const [attrs, setAttrs] = createSignal<Attr[]>(toAttrs(props.value))

  createSignal(() => {
    if (props.value) {
      console.log(props.value)
      setAttrs(toAttrs(props.value))
    }
  }, props.value)

  const add = () => setAttrs((prev) => [...prev, { key: '', values: '' }])

  return (
    <>
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
        <For each={attrs()}>{(attr, i) => <Attribute attr={attr} index={i()} />}</For>
      </div>
    </>
  )
}

const Attribute: Component<{ attr: Attr; index: number }> = (props) => {
  return (
    <div class="flex w-full gap-2">
      <div class="w-3/12">
        <TextInput
          fieldName={`attr-key.${props.index}`}
          placeholder="Name. E.g. appearance"
          value={props.attr.key}
        />
      </div>
      <div class="w-9/12">
        <TextInput
          fieldName={`attr-value.${props.index}`}
          placeholder="Comma separate attributes. E.g: tall, brunette, athletic"
          value={props.attr.values}
        />
      </div>
    </div>
  )
}

export default PersonaAttributes

export function getAttributeMap(entries: Array<[string, string]>) {
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

function toAttrs(value?: Record<string, string[]>) {
  if (!value) return defaultAttrs

  const attrs = Object.entries(value).map<Attr>(([key, values]) => ({
    key,
    values: values.join(', '),
  }))
  return attrs
}
