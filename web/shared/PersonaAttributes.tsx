import { Plus, Trash, WandSparkles } from 'lucide-solid'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  Index,
  on,
  onMount,
  Show,
} from 'solid-js'
import Button from './Button'
import { FormLabel } from './FormLabel'
import TextInput from './TextInput'
import { getFormEntries } from './util'
import { getEncoder } from '/common/tokenize'
import { formatCharacter } from '/common/characters'
import { AppSchema } from '/common/types'
import { CharEditor } from '../pages/Character/editor'

type Attr = { key: string; values: string }

const defaultAttrs = [
  { key: 'species', values: 'human' },
  { key: 'personality', values: '' },
  { key: 'appearance', values: '' },
]

const PersonaAttributes: Component<{
  value?: Record<string, string[]>
  hideLabel?: boolean
  schema?: AppSchema.Persona['kind']
  tokenCount?: boolean | ((count: number) => void)
  form?: any
  disabled?: boolean
  editor: CharEditor
}> = (props) => {
  const [prev, setPrev] = createSignal(props.value)
  const [attrs, setAttrs] = createSignal<Attr[]>(toAttrs(props.value))
  const [tokens, setTokens] = createSignal(0)

  onMount(() => {
    updateCount()
  })

  const plainText = createMemo(() => props.schema === 'text')

  createEffect(() => {
    if (props.value) {
      setAttrs(toAttrs(props.value))
    }
  })

  createEffect(() => {
    if (prev() === props.value) return
    setAttrs(toAttrs(props.value))
    setPrev(props.value)
  })

  createEffect(async () => {
    attrs()
    updateCount()
  })

  const updateCount = async () => {
    if (!props.tokenCount || !props.form) return
    const attributes = getAttributeMap(props.form)

    const encoder = await getEncoder()

    const formatted = formatCharacter(
      'Name',
      { kind: props.schema || 'text', attributes },
      props.schema
    )
    const count = await encoder(formatted)
    setTokens(count)
    if (typeof props.tokenCount === 'function') {
      props.tokenCount(count)
    }
  }

  const add = () => setAttrs((prev) => [...prev, { key: '', values: '' }])

  const onKey = (key: string, index: number) => {
    updateCount()
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
          label=""
          helperText={
            <>
              <span>
                <Show when={!plainText()}>
                  It is highly recommended to always include the <b>personality</b> attribute.&nbsp;
                  <b>Example attributes</b>: mind, personality, appearance, likes, dislikes, hates,
                  loves.
                </Show>
              </span>
              <Show when={props.tokenCount}>
                <br />
                <em class="text-xs">{tokens()} tokens</em>
              </Show>
            </>
          }
        />
      </Show>
      <Show when={plainText()}>
        <div>
          <TextInput fieldName="attr-key.0" value="text" class="hidden" disabled={props.disabled} />
          <TextInput
            fieldName="attr-value.0"
            class="text-input-min-h-override"
            value={props.value?.text?.join('\n\n')}
            isMultiline
            placeholder="Example: {{char}} is a tall man who likes {{user}}."
            tokenCount={() => updateCount()}
            disabled={props.disabled}
          />
        </div>
      </Show>
      <Show when={!plainText()}>
        <div>
          <Button onClick={add} disabled={props.disabled}>
            <Plus size={16} />
            Add Attribute
          </Button>
        </div>
        <div class="mt-2 flex w-full flex-col gap-2">
          <Index each={attrs()}>
            {(attr, i) => (
              <Attribute
                attr={attr()}
                index={i}
                onKey={onKey}
                remove={remove}
                disabled={props.disabled}
                editor={props.editor}
              />
            )}
          </Index>
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
  disabled?: boolean
  editor: CharEditor
}> = (props) => {
  let valueRef: any
  const [key, setKey] = createSignal(props.attr.key)
  const [value, setValue] = createSignal(props.attr.values)

  onMount(() => {
    valueRef.value = props.attr.values
    setKey(props.attr.key)
  })

  createEffect(
    on(
      () => props.attr.values,
      (inc) => {
        const prev = value()
        if (inc === prev) return
        setValue(inc)
        valueRef.value = inc
      }
    )
  )

  createEffect(on(() => props.attr.key, setKey))

  return (
    <div class="flex w-full flex-col gap-2">
      <div class="flex w-full items-center justify-between gap-2">
        <TextInput
          parentClass="w-full"
          fieldName={`attr-key.${props.index}`}
          placeholder="Name. E.g. appearance"
          value={props.attr.key}
          disabled={props.disabled}
          onKeyUp={(ev) => setKey(ev.currentTarget.value)}
        />
        <Button
          schema="secondary"
          onClick={() => props.editor.generateField('persona', props.attr.key)}
        >
          <WandSparkles />
        </Button>
        <Button schema="red" onClick={() => props.remove(props.index)}>
          <Trash size={24} class="" />
        </Button>
      </div>
      <div class="">
        <TextInput
          ref={(r) => (valueRef = r)}
          fieldName={`attr-value.${props.index}`}
          placeholder="Comma separate attributes. E.g: tall, brunette, athletic"
          value={''}
          onKeyUp={(ev) => {
            props.onKey(ev.key, props.index)
            setValue(ev.currentTarget.value)
          }}
          isMultiline
          disabled={props.disabled}
        />
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
      map[id].values = [value]
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
