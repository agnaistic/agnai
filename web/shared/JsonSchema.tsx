import { createStore } from 'solid-js/store'
import { JsonProps, JsonType } from '/common/prompt'
import { Component, Index, Show, createEffect, on } from 'solid-js'
import { SolidCard } from './Card'
import Select from './Select'
import TextInput from './TextInput'
import { forms } from '../emitter'
import { Plus } from 'lucide-solid'
import Button from './Button'
import { useFormField } from './hooks'

export const JsonSchema: Component<{
  inherit?: JsonProps
  update: (schema: JsonProps) => void
  validate?: boolean
}> = (props) => {
  const [state, setState] = createStore({ fields: Object.entries(props.inherit || {}) })

  createEffect(
    on(
      () => props.inherit,
      () => {
        if (!props.inherit) return
        setState({ fields: Object.entries(props.inherit) })
      }
    )
  )

  createEffect(() => {
    const schema = state.fields.reduce<JsonProps>((prev, [key, def]) => {
      return Object.assign(prev, { [key]: def })
    }, {})

    props.update(schema)
  })

  const addField = () => setState('fields', state.fields.concat([['', { type: 'string' }]]))

  forms.useSub((fieldName, value) => {
    const [index, ...prop] = fieldName.split('.')
    const match = state.fields[+index]
    if (!match) return

    const field = prop.join('.')
    const next = state.fields.map<[string, JsonType]>((f, i) => {
      if (i !== +index) return f
      const [name, def] = f

      if (field === 'name') return [value, def]
      return [name, { ...def, [field]: value } as JsonType] as const
    })

    setState('fields', next)
  })

  return (
    <>
      <div class="flex flex-col gap-2">
        <Index each={state.fields}>
          {(item, i) => (
            <SchemaField index={i} name={item()[0]} def={item()[1]} validate={props.validate} />
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

const SchemaField: Component<{ index: number; name: string; def: JsonType; validate?: boolean }> = (
  props
) => {
  const type = useFormField(`${props.index}.type`, props.def.type || 'bool')

  return (
    <SolidCard>
      <div class="flex flex-col gap-2">
        <div class="flex gap-2">
          <Select
            items={[
              { label: 'Boolean', value: 'bool' },
              { label: 'String', value: 'string' },
              { label: 'Number', value: 'integer' },
            ]}
            fieldName={`${props.index}.type`}
            value={props.def.type}
          />
          <Show when={type() === 'string'}>
            <TextInput
              type="number"
              fieldName={`${props.index}.maxLength`}
              placeholder="Max Length"
              value={(props.def as any).maxLength}
            />
          </Show>
          <TextInput
            fieldName={`${props.index}.name`}
            placeholder="Name. E.g. brief_summary"
            value={props.name}
            parentClass="w-1/2"
          />
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
