import { MinusCircle, Plus } from 'lucide-solid'
import { Component, createEffect, createSignal, For, Show } from 'solid-js'
import Button from './Button'
import { FormLabel } from './FormLabel'
import TextInput from './TextInput'
import { getFormEntries } from './util'

type Attr = { key: string; values: string }

const defaultAttrs = [
  { key: 'species', values: 'human' },
  { key: 'mind', values: '' },
  { key: 'personality', values: '' },
]

const PersonaAttributes: Component<{
  value?: Record<string, string[]>
  plainText?: boolean
  hideLabel?: boolean
}> = (props) => {
  const [prev, setPrev] = createSignal(props.value)
  const [attrs, setAttrs] = createSignal<Attr[]>(toAttrs(props.value))

  createSignal(() => {
    if (props.value) {
      setAttrs(toAttrs(props.value))
    }
  })

  createEffect(() => {
    if (prev() === props.value) return
    setAttrs(toAttrs(props.value))
    setPrev(props.value)
  })

  const add = () => setAttrs((prev) => [...prev, { key: '', values: '' }])

  const onKey = (key: string, index: number) => {
    if (key !== 'Enter') return
    if (index + 1 !== attrs().length) return
    add()
  }

  const remove = (i: number) => {
    const next = attrs()
      .slice(0, i)
      .concat(attrs().slice(i + 1))
    setAttrs(next)
  }

  return (
    <>
      <Show when={!props.hideLabel}>
        <FormLabel
          label="Persona Attributes"
          helperText={
            <>
              <span>
                The attributes of your persona. See the link at the top of the page for more
                information.
                <br />
                <Show when={!props.plainText}>
                  It is highly recommended to always include the attributes <b>mind</b> and{' '}
                  <b>personality</b>.<br />
                  <b>Example attributes</b>: mind, personality, appearance, likes, dislikes, hates,
                  loves.
                </Show>
              </span>
            </>
          }
        />
      </Show>
      <Show when={props.plainText}>
        <div>
          <TextInput fieldName="attr-key.0" value="text" class="hidden" />
          <TextInput fieldName="attr-value.0" value={props.value?.text?.[0]} isMultiline />
        </div>
      </Show>
      <Show when={!props.plainText}>
        <div>
          <Button onClick={add}>
            <Plus size={16} />
            Add Attribute
          </Button>
        </div>
        <div class="mt-2 flex w-full flex-col gap-2">
          <For each={attrs()}>
            {(attr, i) => <Attribute attr={attr} index={i()} onKey={onKey} remove={remove} />}
          </For>
        </div>
      </Show>
    </>
  )
}

const Attribute: Component<{
  attr: Attr
  index: number
  onKey: (key: string, i: number) => void
  remove: (i: number) => void
}> = (props) => {
  return (
    <div class="flex w-full gap-2">
      <div class="w-3/12">
        <TextInput
          fieldName={`attr-key.${props.index}`}
          placeholder="Name. E.g. appearance"
          value={props.attr.key}
        />
      </div>
      <div class="w-8/12">
        <TextInput
          fieldName={`attr-value.${props.index}`}
          placeholder="Comma separate attributes. E.g: tall, brunette, athletic"
          value={props.attr.values}
          onKeyUp={(ev) => props.onKey(ev.key, props.index)}
        />
      </div>
      <div class="1/12 flex items-center" onClick={() => props.remove(props.index)}>
        <MinusCircle size={16} class="focusable-icon-button" />
      </div>
    </div>
  )
}

export default PersonaAttributes

export function getAttributeMap(event: Event | HTMLFormElement) {
  const entries = getFormEntries(event)
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
      map[id].value = [value]
      map[id].values = value
        .split(',')
        .map((i) => i.trim())
        .filter((i) => !!i)
    }
  }

  const values = Object.values(map).reduce<Record<string, string[]>>((prev: any, curr: any) => {
    if (!curr.values || !curr.values.length) return prev
    if (curr.key === 'text') prev[curr.key] = curr.value
    else prev[curr.key] = curr.values
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
