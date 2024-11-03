import { Component, Index, Show, Signal } from 'solid-js'
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
  level: number
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
    empty: () => ({
      id: v4().slice(0, 4),
      name: '',
      desc: '',
      override: '',
      level: 0,
      init: { steps: 10, cfg: 2, height: 1024, width: 1024 },
      limit: { steps: 50, cfg: 20, height: 1024, width: 1024 },
    }),
  })

  return (
    <>
      <div class="flex items-center gap-2">
        Image Models{' '}
        <Button size="md" onClick={rows.add}>
          Add
        </Button>
      </div>
      <div class="flex flex-col gap-2">
        <Index each={rows.items()}>
          {(item, i) => (
            <ImageModel index={i} item={item()} updater={rows.updater} remove={rows.remove} />
          )}
        </Index>
      </div>
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
    <div class="flex flex-col gap-2">
      <table class="bg-700 table-auto border-separate border-spacing-0.5 rounded-md">
        <Show when={props.index === 0}>
          <thead>
            <tr>
              <Th />
              <Th>Steps</Th>
              <Th>CFG</Th>
              <Th>Width</Th>
              <Th>Height</Th>
            </tr>
          </thead>
        </Show>
        <tbody>
          <tr>
            <Td>
              <TextInput
                prelabel="Name"
                fieldName="model.name"
                parentClass=""
                placeholder="Model Name..."
                onChange={props.updater(props.index, 'name')}
                value={props.item.name}
              />
            </Td>
            <Td>
              <TextInput
                prelabel="Desc"
                fieldName="model.desc"
                parentClass=""
                placeholder="Model Description..."
                onChange={props.updater(props.index, 'desc')}
                value={props.item.desc}
              />
            </Td>
            <Td>
              <TextInput
                prelabel="Override"
                fieldName="model.override"
                parentClass=""
                placeholder="Override..."
                onChange={props.updater(props.index, 'override')}
                value={props.item.override || ''}
              />
            </Td>
            <Td>
              <TextInput
                prelabel="Level"
                fieldName="model.level"
                parentClass=""
                placeholder="Sub Level"
                onChange={props.updater(props.index, 'level')}
                value={props.item.level ?? 0}
              />
            </Td>
            <Td>
              <Button size="sm" schema="red" onClick={() => props.remove(props.index)}>
                Remove
              </Button>
            </Td>
          </tr>
          <tr>
            <Td class="text-500 border-0 px-2 text-right text-sm">Recommended</Td>
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
            <Td class="text-500 border-0 px-2 text-right text-sm">Maximums</Td>
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
