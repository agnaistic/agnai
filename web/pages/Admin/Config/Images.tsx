import { Component, For, Signal } from 'solid-js'
import { Card } from '/web/shared/Card'
import TextInput from '/web/shared/TextInput'
import { Toggle } from '/web/shared/Toggle'
import { adminStore, settingStore } from '/web/store'
import { AppSchema } from '/common/types'
import { FieldUpdater, useRowHelper } from '/web/shared/util'
import Button from '/web/shared/Button'
import { v4 } from 'uuid'

type Threshold = { steps: number; cfg: number; height: number; width: number }
type Model = {
  id: string
  name: string
  desc: string
  override: string
  init: Threshold
  limit: Threshold
}

export const Images: Component<{ models: Signal<AppSchema.ImageModel[]> }> = (props) => {
  const settings = settingStore((s) => s.config)
  const state = adminStore()

  return (
    <Card bg="bg-500">
      <TextInput
        fieldName="imagesHost"
        label={
          <>
            <div class="flex gap-2">
              <div>Images Host (A1111 Compatible)</div>
              <Toggle fieldName="imagesEnabled" value={state.config?.imagesEnabled} />
            </div>
          </>
        }
        value={state.config?.imagesHost}
        classList={{ hidden: !settings.adapters.includes('agnaistic') }}
      />

      <ImageModels signal={props.models} />
    </Card>
  )
}

const ImageModels: Component<{ signal: Signal<Model[]> }> = (props) => {
  const rows = useRowHelper({
    signal: props.signal,
    empty: {
      id: v4().slice(0, 4),
      name: '',
      desc: '',
      override: '',
      init: { steps: 5, cfg: 2, height: 1024, width: 1024 },
      limit: { steps: 128, cfg: 20, height: 1024, width: 1024 },
    },
  })

  return (
    <>
      <div class="flex items-center gap-2">
        Image Models{' '}
        <Button size="md" onClick={rows.add}>
          Add
        </Button>
      </div>
      <For each={rows.items()}>
        {(item, i) => (
          <ImageModel index={i()} item={item} updater={rows.updater} remove={rows.remove} />
        )}
      </For>
      <Button size="sm" onClick={rows.add}>
        Add Model
      </Button>
    </>
  )
}

const ImageModel: Component<{
  index: number
  item: Model
  updater: FieldUpdater
  remove: (index: number) => void
}> = (props) => {
  return (
    <div class="flex flex-col gap-1">
      <div class="flex w-full items-center gap-2">
        <TextInput
          fieldName="model.name"
          parentClass="w-1/4"
          placeholder="Model Name..."
          onChange={props.updater(props.index, 'name')}
          value={props.item.name}
        />
        <TextInput
          fieldName="model.desc"
          parentClass="w-1/2"
          placeholder="Model Description..."
          onChange={props.updater(props.index, 'desc')}
          value={props.item.desc}
        />
        <TextInput
          fieldName="model.override"
          parentClass="w-1/4"
          placeholder="Override..."
          onChange={props.updater(props.index, 'override')}
          value={props.item.override || ''}
        />

        <Button size="sm" schema="red" onClick={() => props.remove(props.index)}>
          Remove
        </Button>
      </div>

      <table class="table-auto border-separate border-spacing-2">
        <thead>
          <tr>
            <Th />
            <Th>Steps</Th>
            <Th>CFG</Th>
            <Th>Width</Th>
            <Th>Height</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td class="px-2 font-bold">Recommended</Td>
            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.init.steps"
                onChange={props.updater(props.index, 'init.steps')}
                value={props.item.init.steps}
              />
            </Td>

            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.init.cfg"
                onChange={props.updater(props.index, 'init.cfg')}
                value={props.item.init.cfg}
              />
            </Td>

            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.init.width"
                onChange={props.updater(props.index, 'init.width')}
                value={props.item.init.width}
              />
            </Td>

            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.init.height"
                onChange={props.updater(props.index, 'init.height')}
                value={props.item.init.height}
              />
            </Td>
          </tr>

          <tr>
            <Td class="px-2 font-bold">Maximums</Td>
            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.limit.steps"
                onChange={props.updater(props.index, 'limit.steps')}
                value={props.item.limit.steps}
              />
            </Td>

            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.limit.cfg"
                onChange={props.updater(props.index, 'limit.cfg')}
                value={props.item.limit.cfg}
              />
            </Td>

            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.limit.width"
                onChange={props.updater(props.index, 'limit.width')}
                value={props.item.limit.width}
              />
            </Td>

            <Td>
              <TextInput
                type="number"
                parentClass="col-span-2"
                fieldName="model.limit.height"
                onChange={props.updater(props.index, 'limit.height')}
                value={props.item.limit.height}
              />
            </Td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

const Th: Component<{ children?: any }> = (props) => (
  <th
    class="rounded-md border-[var(--bg-600)] px-2 font-bold"
    classList={{ border: !!props.children, 'bg-[var(--bg-700)]': !!props.children }}
  >
    {props.children}
  </th>
)
const Td: Component<{ children?: any; class?: string }> = (props) => (
  <td
    class={`rounded-md border-[var(--bg-600)] ${props.class || ''}`}
    classList={{ border: !!props.children }}
  >
    {props.children}
  </td>
)
