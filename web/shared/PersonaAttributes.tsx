import { MinusCircle, Plus } from 'lucide-solid'
import { Component, createEffect, createSignal, For, onMount, Show } from 'solid-js'
import Button from './Button'
import { FormLabel } from './FormLabel'
import TextInput from './TextInput'
import { getFormEntries } from './util'
import { getEncoder } from '/common/tokenize'
import { formatCharacter } from '/common/characters'
import { AppSchema } from '/common/types'

type Attr = { key: string; values: string }

const defaultAttrs = [
  { key: 'species', values: 'human' },
  { key: 'personality', values: '' },
  { key: 'appearance', values: '' },
]

const PersonaAttributes: Component<{
  value?: Record<string, string[]>
  plainText?: boolean
  hideLabel?: boolean
  schema?: AppSchema.Persona['kind']
  tokenCount?: boolean | ((count: number) => void)
  form?: any
  disabled?: boolean
}> = (props) => {
  const [prev, setPrev] = createSignal(props.value)
  const [attrs, setAttrs] = createSignal<Attr[]>(toAttrs(props.value))
  const [tokens, setTokens] = createSignal(0)

  onMount(() => {
    updateCount()
  })

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
          label="Personality"
          helperText={
            <>
              <span>
                <Show when={!props.plainText}>
                  It is highly recommended to always include the <b>personality</b> attribute.
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
      <Show when={props.plainText}>
        <div>
          <TextInput fieldName="attr-key.0" value="text" class="hidden" disabled={props.disabled} />
          <TextInput
            fieldName="attr-value.0"
            class="text-input-min-h-override"
            value={props.value?.text?.[0]}
            isMultiline
            placeholder="{{char}} is a tall man who likes {{user}}."
            tokenCount={() => updateCount()}
            disabled={props.disabled}
          />
        </div>
      </Show>
      <Show when={!props.plainText}>
        <div>
          <Button onClick={add} disabled={props.disabled}>
            <Plus size={16} />
            Add Attribute
          </Button>
        </div>
        <div class="mt-2 flex w-full flex-col gap-2">
          <For each={attrs()}>
            {(attr, i) => (
              <Attribute
                attr={attr}
                index={i()}
                onKey={onKey}
                remove={remove}
                disabled={props.disabled}
              />
            )}
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
  disabled?: boolean
}> = (props) => {
  return (
    <div class="flex w-full flex-col gap-2 sm:flex-row">
      <div class="flex w-full items-start gap-1 sm:w-3/12">
        <TextInput
          fieldName={`attr-key.${props.index}`}
          placeholder="Name. E.g. appearance"
          value={props.attr.key}
          disabled={props.disabled}
        />
        <div class="sm:hidden" onClick={() => props.remove(props.index)}>
          <MinusCircle size={16} class="focusable-icon-button" />
        </div>
      </div>
      <div class="sm:w-9/12">
        <TextInput
          fieldName={`attr-value.${props.index}`}
          placeholder="Comma separate attributes. E.g: tall, brunette, athletic"
          value={props.attr.values}
          onKeyUp={(ev) => props.onKey(ev.key, props.index)}
          isMultiline
          disabled={props.disabled}
        />
      </div>
      <div class="1/12 hidden items-start sm:flex" onClick={() => props.remove(props.index)}>
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
