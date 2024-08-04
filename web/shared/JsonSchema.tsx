import { createStore } from 'solid-js/store'
import { JsonField, JsonType } from '/common/prompt'
import { Component, Index, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
import { SolidCard } from './Card'
import Select from './Select'
import TextInput from './TextInput'
import { forms } from '../emitter'
import { Plus, X } from 'lucide-solid'
import Button from './Button'
import { useFormField } from './hooks'
import { Toggle } from './Toggle'

export const JsonSchema: Component<{
  inherit?: JsonField[]
  update: (schema: JsonField[]) => void
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

  forms.useSub((fieldName, value) => {
    const [index, ...prop] = fieldName.split('.')
    const match = state.fields[+index]
    if (!match) return

    const field = prop.join('.')
    const next = state.fields.map<JsonField>((f, i) => {
      if (i !== +index) return f

      if (field === 'name') return { name: value, disabled: f.disabled, type: f.type }
      if (field === 'disabled') return { name: f.name, disabled: !value, type: f.type }

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
}> = (props) => {
  const type = useFormField(`${props.index}.type`, props.def.type || 'bool')

  const [enabled, setEnabled] = createSignal(!props.disabled)
  const border = createMemo(() => (enabled() ? 'bg-200' : 'red-800'))

  createEffect(() => {
    const disabled = props.disabled
    setEnabled(!disabled)
  })

  return (
    <SolidCard borderColor={border()}>
      <div class="flex flex-col gap-2">
        <div class="flex justify-between">
          <div class="flex w-full gap-2">
            <Select
              items={[
                { label: 'Boolean', value: 'bool' },
                { label: 'String', value: 'string' },
                { label: 'Number', value: 'integer' },
              ]}
              fieldName={`${props.index}.type`}
              value={props.def.type}
            />
            <TextInput
              fieldName={`${props.index}.name`}
              placeholder="Name. E.g. brief_summary"
              value={props.name}
              parentClass="w-1/2"
            />
            <Show when={type() === 'string'}>
              <TextInput
                type="number"
                fieldName={`${props.index}.maxLength`}
                placeholder="Max Length"
                value={(props.def as any).maxLength}
              />
            </Show>
            <Show when={props.validate && type() === 'enum'}>
              <TextInput
                fieldName={`${props.index}.valid`}
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
          <div class="flex gap-2">
            <Toggle
              fieldName={`${props.index}.disabled`}
              onChange={(ev) => setEnabled(ev)}
              value={!props.disabled}
            />
            <Button size="sm" schema="error" onClick={props.remove}>
              <X />
            </Button>
          </div>
        </div>

        <div class="flex gap-2">
          <TextInput
            fieldName={`${props.index}.title`}
            placeholder="(Optional) Title. E.g. Brief Chat Summary"
            value={props.def.title}
            parentClass="w-1/2"
          />
          <TextInput
            fieldName={`${props.index}.description`}
            value={props.def.description}
            placeholder="(Optional) Description"
            parentClass="w-1/2"
          />
        </div>
      </div>
    </SolidCard>
  )
}
