import { Plus, Trash, WandSparkles } from 'lucide-solid'
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  Index,
  on,
  onMount,
  Show,
} from 'solid-js'
import Button from './Button'
import { FormLabel } from './FormLabel'
import TextInput from './TextInput'
import { getEncoder } from '/common/tokenize'
import { formatCharacter } from '/common/characters'
import { AppSchema } from '/common/types'
import { CharEditor } from '../pages/Character/editor'
import { SetStoreFunction } from 'solid-js/store'
import { createDebounce } from './util'

type Attr = { key: string; values: string }

export type PersonaState = Record<string, string[]>

export type SetPersonaState = SetStoreFunction<PersonaState>

const defaultAttrs = [
  { key: 'species', values: 'human' },
  { key: 'personality', values: '' },
  { key: 'appearance', values: '' },
]

const PersonaAttributes: Component<{
  state: Attr[]
  setter: (next: Attr[]) => void
  hideLabel?: boolean
  schema?: AppSchema.Persona['kind']
  tokenCount?: boolean | ((count: number) => void)
  form?: any
  disabled?: boolean
  editor?: CharEditor
}> = (props) => {
  const [tokens, setTokens] = createSignal(0)

  onMount(() => {
    countTokens()
  })

  createEffect(
    on(
      () => props.state,
      (attrs) => {
        if (!attrs.length) return
        if (tokens()) return

        countTokens()
      }
    )
  )

  createEffect(
    on(
      () => props.schema,
      (kind, prev) => {
        // Convert the attributes to a text blob if switching from text -> attrs
        if (prev !== 'text' && kind === 'text') {
          let squished: string[] = []
          for (const { key, values } of props.state) {
            if (key === 'text') {
              squished.push(values)
            } else {
              if (!values.trim()) continue
              squished.push(`${key}:\n${values}`)
            }
          }

          props.setter([{ key: 'text', values: squished.join('\n\n') }].concat(props.state))
        }

        // If we switch from text -> attrs, omit the 'text' attribute if it is the squished version from above
        if (kind !== 'text' && prev === 'text') {
          const text = props.state.find((s) => s.key === 'text')
          if (!text) return

          if (props.state.length === 1) {
            props.setter([{ key: 'personality', values: props.state[0].values }])
            return
          }

          let matching = true
          for (const { values } of props.state) {
            if (!text.values.includes(values)) matching = false
            break
          }

          if (matching) {
            props.setter(props.state.filter((s) => s.key !== 'text'))
          }
        }
      }
    )
  )

  const plainText = createMemo(() => props.schema === 'text')

  const updateCount = async () => {
    if (!props.tokenCount) return
    const attributes = fromAttrs(props.state)

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

  const [countTokens] = createDebounce(updateCount, 1000)

  const add = () => {
    const next = props.state.concat({ key: '', values: '' })
    props.setter(next)
  }

  const remove = (i: number) => {
    const next = props.state.slice(0, i).concat(props.state.slice(i + 1))
    props.setter(next)
  }

  const update = (attr: Attr, index: number, prop: 'key' | 'values', value: string) => {
    const upd = {
      key: prop === 'key' ? value : attr.key,
      values: prop === 'values' ? value : attr.values,
    }

    const next = props.state.map((a, i) => (i === index ? upd : a))
    props.setter(next)
    countTokens()
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
          <TextInput value="text" class="hidden" disabled={props.disabled} />
          <TextInput
            class="text-input-min-h-override"
            value={props.state[0]?.values || ''}
            isMultiline
            placeholder="Example: {{char}} is a tall man who likes {{user}}."
            tokenCount={() => updateCount()}
            disabled={props.disabled}
            onChange={(ev) => props.setter([{ key: 'text', values: ev.currentTarget.value }])}
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
          <Index each={props.state}>
            {(attr, i) => (
              <Attribute
                attr={attr()}
                index={i}
                remove={remove}
                disabled={props.disabled}
                update={update}
                editor={props.editor}
                // onKey={onKey}
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
  remove: (i: number) => void
  update: (attr: Attr, index: number, prop: 'key' | 'values', value: string) => void
  disabled?: boolean
  editor?: CharEditor
  // onKey: (key: string, i: number) => void
}> = (props) => {
  return (
    <div class="bg-700 flex w-full flex-col gap-2 rounded-md p-1">
      <div class="flex w-full items-center justify-between gap-2">
        <TextInput
          parentClass="w-full"
          placeholder="Name. E.g. appearance"
          value={props.attr.key}
          disabled={props.disabled}
          onChange={(ev) => props.update(props.attr, props.index, 'key', ev.currentTarget.value)}
        />
        <Show when={props.editor}>
          <Button
            schema="secondary"
            onClick={() => props.editor?.generateField('persona', props.attr.key)}
          >
            <WandSparkles size={20} />
          </Button>
        </Show>
        <Button schema="red" onClick={() => props.remove(props.index)}>
          <Trash size={20} class="" />
        </Button>
      </div>

      <TextInput
        placeholder="Comma separate attributes. E.g: tall, brunette, athletic"
        value={props.attr.values}
        onChange={(ev) => props.update(props.attr, props.index, 'values', ev.currentTarget.value)}
        isMultiline
        disabled={props.disabled}
      />
    </div>
  )
}

export default PersonaAttributes

export function toAttrs(value?: Record<string, string[]>) {
  if (!value) return defaultAttrs

  const attrs = Object.entries(value).map<Attr>(([key, values]) => ({
    key,
    values: values.join(', '),
  }))
  return attrs
}

export function fromAttrs(attrs: Array<{ key: string; values: string }>) {
  let map: Record<string, string[]> = {}
  for (const { key, values } of attrs) {
    map[key] = [values]
  }

  return map
}
