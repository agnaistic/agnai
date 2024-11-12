import { createStore } from 'solid-js/store'
import { JsonField, JsonType } from '/common/prompt'
import { Component, Index, Show, createEffect, createMemo, on } from 'solid-js'
import { Pill, SolidCard } from './Card'
import Select from './Select'
import TextInput from './TextInput'
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash } from 'lucide-solid'
import Button from './Button'

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

  const update = (update: Partial<JsonField>, index: number) => {
    const next = state.fields.map((f, i) => {
      if (i === index) return { ...f, ...update }
      return f
    })

    setState({ fields: next })
  }

  const updateType = (update: Partial<JsonType>, index: number) => {
    const next = state.fields.map((f, i) => {
      if (i === index) return { ...f, type: { ...f.type, ...update } }
      return f
    })

    setState({ fields: next as any })
  }

  return (
    <>
      <div class="flex flex-col gap-2">
        <Index each={state.fields}>
          {(item, i) => (
            <SchemaField
              index={i}
              item={item()}
              validate={props.validate}
              remove={() => removeField(i)}
              last={i === state.fields.length - 1}
              moveUp={moveUp}
              moveDown={moveDown}
              update={update}
              updateType={updateType}
            />
          )}
        </Index>
        <Button class="w-full" onClick={addField}>
          <Plus />
          Add Field
        </Button>
      </div>
    </>
  )
}

const SchemaField: Component<{
  index: number
  item: JsonField
  validate?: boolean
  remove: () => void
  last: boolean
  moveUp: (i: number) => void
  moveDown: (i: number) => void
  update: (partial: Partial<JsonField>, index: number) => void
  updateType: (partial: Partial<JsonType>, index: number) => void
}> = (props) => {
  const border = createMemo(() => (!props.item.disabled ? 'bg-500' : 'red-800'))

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
            value={props.item.type.type}
            onChange={(ev) => props.updateType({ type: ev.value as any }, props.index)}
          />
          <TextInput
            placeholder="Name. E.g. brief_summary"
            value={props.item.name}
            class="h-8"
            parentClass="w-full"
            onChange={(ev) => props.update({ name: ev.currentTarget.value }, props.index)}
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
                value={props.item.type.title}
                parentClass="w-full"
                onChange={(ev) => props.updateType({ title: ev.currentTarget.value }, props.index)}
              />
              <TextInput
                fieldName={`${props.index}.description`}
                value={props.item.type.description}
                placeholder="(Optional) Description"
                parentClass="w-1/2 hidden"
                onChange={(ev) =>
                  props.updateType({ description: ev.currentTarget.value }, props.index)
                }
              />
            </div>

            <div class="flex gap-2">
              <Button
                size="md"
                schema={!props.item.disabled ? 'success' : 'hollow'}
                onClick={() => {
                  props.update({ disabled: !props.item.disabled }, props.index)
                }}
              >
                <Show when={!props.item.disabled}>
                  <Eye size={16} />
                </Show>
                <Show when={props.item.disabled}>
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
            classList={{
              hidden:
                !props.item.type.valid &&
                props.item.type.type !== 'string' &&
                props.item.type.type !== 'enum',
            }}
          >
            <Show when={props.item.type.type === 'string'}>
              <TextInput
                type="number"
                fieldName={`${props.index}.maxLength`}
                placeholder="Max String Length"
                value={(props.item.type as any).maxLength}
                onChange={(ev) =>
                  props.updateType({ maxLength: +ev.currentTarget.value }, props.index)
                }
              />
            </Show>
            <Show when={props.item.type.type === 'enum'}>
              <TextInput
                value={(props.item.type as any).enum?.join(',')}
                placeholder="(Optional) Allowed values - comma seperated"
                parentClass="w-1/2"
                onChange={(ev) =>
                  props.updateType({ enum: ev.currentTarget.value.split(',') }, props.index)
                }
              />
            </Show>
            <Show when={props.validate && props.item.type.type === 'bool'}>
              <Select
                items={[
                  { label: 'Ignore', value: '' },
                  { label: 'True', value: 'true' },
                  { label: 'False', value: 'false' },
                ]}
                value={props.item.type.valid}
                onChange={(ev) => props.updateType({ valid: ev.value }, props.index)}
              />
            </Show>
          </div>
        </div>
      </SolidCard>
    </div>
  )
}
