import { createStore } from 'solid-js/store'
import { JsonField, JsonType } from '/common/prompt'
import { Component, Index, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
import { Pill, SolidCard } from './Card'
import Select from './Select'
import TextInput from './TextInput'
import { forms } from '../emitter'
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash } from 'lucide-solid'
import Button from './Button'
import { useFormField } from './hooks'

export const JsonSchema: Component<{
  inherit?: JsonField[]
  update: (schema: JsonField[]) => void
  onNameChange?: (from: string, to: string) => void
  validate?: boolean
}> = (props) => {
  const [state, setState] = createStore({
    fields: Array.isArray(props.inherit) ? props.inherit : [],
  })

  createEffect(
    on(
      () => props.inherit,
      () => {
        if (!props.inherit) return
        setState({ fields: Array.isArray(props.inherit) ? props.inherit : [] })
      }
    )
  )

  createEffect(() => {
    const fields = state.fields

    props.update(fields)
  })

  const addField = () =>
    setState(
      'fields',
      state.fields.concat([{ name: '', disabled: false, type: { type: 'string' } }])
    )

  const removeField = (index: number) => {
    const next = state.fields.slice()
    next.splice(index, 1)
    setState('fields', next)
  }

  const moveUp = (index: number) => {
    const [t, b] = state.fields.slice(index - 1, index + 1)
    const next = state.fields.slice()
    next[index - 1] = b
    next[index] = t
    setState({ fields: next })
  }

  const moveDown = (index: number) => {
    const [t, b] = state.fields.slice(index, index + 2)
    const next = state.fields.slice()
    next[index] = b
    next[index + 1] = t
    setState({ fields: next })
  }

  forms.useSub((fieldName, value) => {
    const [index, ...prop] = fieldName.split('.')
    const match = state.fields[+index]
    if (!match) return

    const field = prop.join('.')
    const next = state.fields.map<JsonField>((f, i) => {
      if (i !== +index) return f

      if (field === 'name') {
        props.onNameChange?.(f.name, value)
        return { name: value, disabled: f.disabled, type: f.type }
      }
      if (field === 'disabled') return { name: f.name, disabled: !value, type: f.type }
      if (field === 'enum') {
        return {
          name: f.name,
          disabled: f.disabled,
          type: {
            ...f.type,
            enum: (value || '').split(',').map((t: string) => t.trim()),
          },
        }
      }

      return {
        name: f.name,
        disabled: f.disabled,
        type: { ...f.type, [field]: value } as JsonType,
      } as const
    })

    setState('fields', next)
  })

  return (
    <>
      <div class="flex flex-col gap-2">
        <Index each={state.fields}>
          {(item, i) => (
            <SchemaField
              index={i}
              disabled={item().disabled}
              name={item().name}
              def={item().type}
              validate={props.validate}
              remove={() => removeField(i)}
              last={i === state.fields.length - 1}
              moveUp={moveUp}
              moveDown={moveDown}
            />
          )}
        </Index>
        <Button class="w-full" onClick={addField}>
          <Plus />
          Add
        </Button>
      </div>
    </>
  )
}

const SchemaField: Component<{
  index: number
  name: string
  disabled: boolean
  def: JsonType
  validate?: boolean
  remove: () => void
  last: boolean
  moveUp: (i: number) => void
  moveDown: (i: number) => void
}> = (props) => {
  let enabledRef: HTMLInputElement
  const type = useFormField(`${props.index}.type`, props.def.type || 'bool')

  const [enabled, setEnabled] = createSignal(!props.disabled)
  const border = createMemo(() => (enabled() ? 'bg-500' : 'red-800'))

  createEffect(() => {
    const disabled = props.disabled
    setEnabled(!disabled)
  })

  return (
    <div class="flex flex-col">
      <div class="flex w-full gap-1">
        <Pill small class="text-800 flex w-full gap-1 rounded-b-none rounded-t-md sm:w-1/2">
          <Select
            class="text-800 text-xs"
            items={[
              { label: 'Boolean', value: 'bool' },
              { label: 'String', value: 'string' },
              { label: 'Number', value: 'integer' },
              { label: 'Enum', value: 'enum' },
            ]}
            fieldName={`${props.index}.type`}
            value={props.def.type}
          />
          <TextInput
            fieldName={`${props.index}.name`}
            placeholder="Name. E.g. brief_summary"
            value={props.name}
            class="h-8"
            parentClass="w-full"
          />
        </Pill>
        <Button
          schema="clear"
          disabled={props.index === 0}
          onClick={() => props.moveUp(props.index)}
        >
          <ArrowUp size={12} />
        </Button>

        <Button schema="clear" disabled={props.last} onClick={() => props.moveDown(props.index)}>
          <ArrowDown size={12} />
        </Button>
      </div>
      <SolidCard borderColor={border()} class="rounded-tl-none ">
        <div class="flex flex-col gap-2">
          <div class="flex justify-between gap-2">
            <div class="hidden w-full">
              <TextInput
                fieldName={`${props.index}.title`}
                placeholder="(Optional) Title. E.g. Brief Chat Summary"
                value={props.def.title}
                parentClass="w-full"
              />
              <TextInput
                fieldName={`${props.index}.description`}
                value={props.def.description}
                placeholder="(Optional) Description"
                parentClass="w-1/2 hidden"
              />
            </div>

            <div class="flex gap-2">
              <input
                ref={(r) => (enabledRef = r)}
                id={`${props.index}.disabled`}
                name={`${props.index}.disabled`}
                type="hidden"
                checked={props.disabled}
                onChange={(ev) => forms.emit(`${props.index}.disabled`, !ev.currentTarget.checked)}
              />
              <Button
                size="md"
                schema={enabled() ? 'success' : 'hollow'}
                onClick={() => {
                  const next = !enabled()
                  enabledRef.checked = next
                  setEnabled(next)
                  forms.emit(`${props.index}.disabled`, next)
                }}
              >
                <Show when={enabled()}>
                  <Eye size={16} />
                </Show>
                <Show when={!enabled()}>
                  <EyeOff size={16} />
                </Show>
              </Button>
              <Button size="md" schema="error" onClick={props.remove}>
                <Trash size={16} />
              </Button>
            </div>
          </div>

          <div
            class="flex w-full gap-2"
            classList={{ hidden: !props.def.valid && type() !== 'string' }}
          >
            <Show when={type() === 'string'}>
              <TextInput
                type="number"
                fieldName={`${props.index}.maxLength`}
                placeholder="Max String Length"
                value={(props.def as any).maxLength}
              />
            </Show>
            <Show when={props.validate && type() === 'enum'}>
              <TextInput
                fieldName={`${props.index}.enum`}
                placeholder="(Optional) Allowed values - comma seperated"
                parentClass="w-1/2"
                value={props.def.valid}
              />
            </Show>
            <Show when={props.validate && type() === 'bool'}>
              <Select
                fieldName={`${props.index}.valid`}
                items={[
                  { label: 'Ignore', value: '' },
                  { label: 'True', value: 'true' },
                  { label: 'False', value: 'false' },
                ]}
                value={props.def.valid}
              />
            </Show>
          </div>
        </div>
      </SolidCard>
    </div>
  )
}
