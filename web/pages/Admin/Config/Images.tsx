import { Component, Index, Signal } from 'solid-js'
import { Card } from '/web/shared/Card'
import TextInput from '/web/shared/TextInput'
import { Toggle } from '/web/shared/Toggle'
import { adminStore, settingStore } from '/web/store'
import { AppSchema } from '/common/types'
import { FieldUpdater, useRowHelper } from '/web/shared/util'
import Button, { ToggleButton } from '/web/shared/Button'
import { v4 } from 'uuid'
import { Plus, Trash } from 'lucide-solid'
import { ImageModel } from '/common/types/admin'
import { SD_SAMPLER, SD_SAMPLER_OPTS } from '/common/image'
import Select from '/web/shared/Select'
import Accordian from '/web/shared/Accordian'

type Threshold = { steps: number; cfg: number; height: number; width: number }
type InitThreshold = ImageModel['init']
type Model = {
  id: string
  name: string
  desc: string
  override: string
  init: InitThreshold
  limit: Threshold
  level: number
  host: string
  lora: boolean
}

export const Images: Component<{ models: Signal<AppSchema.ImageModel[]> }> = (props) => {
  const settings = settingStore((s) => s.config)
  const state = adminStore()

  return (
    <Card bg="bg-800" class="flex flex-col gap-2" bgOpacity={1}>
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
      host: '',
      level: 0,
      lora: false,
      init: {
        steps: 20,
        cfg: 5,
        height: 1024,
        width: 1024,
        prefix: '',
        suffix: '',
        negative: '',
        clipSkip: 2,
        denoise: 1,
        sampler: SD_SAMPLER['Euler a'],
      },
      limit: { steps: 40, cfg: 10, height: 1024, width: 1024 },
    }),
  })

  return (
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        Image Models{' '}
        <Button size="sm" onClick={rows.add}>
          <Plus size={12} />
          Add
        </Button>
      </div>
      <div class="flex flex-col gap-3">
        <Index each={rows.items()}>
          {(item, i) => (
            <Model index={i} item={item()} updater={rows.updater} remove={rows.remove} />
          )}
        </Index>
      </div>
      <Button size="sm" onClick={rows.add}>
        Add Model
      </Button>
    </div>
  )
}

const bg = 'bg-700'
const size = 'md'
const opacity = 0.5

const Model: Component<{
  index: number
  item: Model
  updater: FieldUpdater
  remove: (index: number) => void
}> = (props) => {
  return (
    <Accordian title={props.item.desc} titleClickOpen open={false}>
      <Card
        bg="bg-900"
        bgOpacity={1}
        class="box-border flex flex-col gap-3 !border-[1px] !border-solid !border-[var(--bg-700)] "
      >
        <div class="flex gap-3">
          <TextInput
            prelabel="Description"
            placeholder="Model Description..."
            onChange={props.updater(props.index, 'desc')}
            parentClass="h-8 w-1/2"
            value={props.item.desc}
            variant="outline"
          />

          <TextInput
            prelabel="URL"
            placeholder=""
            onChange={props.updater(props.index, 'host')}
            parentClass="h-8 w-1/2"
            value={props.item.host}
            variant="outline"
          />

          <ToggleButton
            class="min-w-fit"
            value={props.item.lora ?? false}
            onChange={props.updater(props.index, 'lora')}
          >
            LoRA Support
          </ToggleButton>
        </div>

        <div class="flex gap-2 text-sm font-normal">
          <TextInput
            prelabel="Host"
            placeholder="Model Name..."
            onChange={props.updater(props.index, 'name')}
            value={props.item.name}
            parentClass="h-8 w-1/3"
            variant="outline"
          />

          <TextInput
            prelabel="Override"
            fieldName="model.override"
            placeholder="Override..."
            onChange={props.updater(props.index, 'override')}
            parentClass="h-8 w-1/3"
            value={props.item.override || ''}
            variant="outline"
          />
          <TextInput
            prelabel="Level"
            type="number"
            parentClass="w-32 h-8 min-w-[7rem]"
            onChange={props.updater(props.index, 'level')}
            value={props.item.level ?? 0}
            variant="outline"
          />

          <Select
            value={props.item.init.sampler}
            items={[{ label: 'None', value: '' }].concat(SD_SAMPLER_OPTS)}
            onChange={props.updater(props.index, 'init.sampler')}
          ></Select>
        </div>

        <div class="flex w-full gap-3">
          <TextInput
            prelabel="Prefix"
            onChange={props.updater(props.index, 'init.prefix')}
            value={props.item.init.prefix}
            variant="outline"
            parentClass="w-1/3 h-8"
          />
          <TextInput
            prelabel="Suffix"
            onChange={props.updater(props.index, 'init.suffix')}
            value={props.item.init.suffix}
            variant="outline"
            parentClass="w-1/3 h-8"
          />

          <TextInput
            prelabel="Negative"
            onChange={props.updater(props.index, 'init.negative')}
            value={props.item.init.negative}
            variant="outline"
            parentClass="w-1/3 h-8"
          />
          <Button schema="red" onClick={() => props.remove(props.index)}>
            <Trash size={16} />
          </Button>
        </div>

        <div class="flex flex-wrap gap-2">
          <Card class="flex flex-col gap-1" bgOpacity={opacity} bg={bg} size={size}>
            <div class="flex justify-center">Steps</div>
            <div class="flex gap-1">
              <TextInput
                type="number"
                parentClass="w-32 h-8"
                prelabel="Init"
                onChange={props.updater(props.index, 'init.steps')}
                value={props.item.init.steps}
                variant="outline"
              />
              <TextInput
                type="number"
                parentClass="w-32 h-8"
                prelabel="Max"
                onChange={props.updater(props.index, 'limit.steps')}
                value={props.item.limit.steps}
                variant="outline"
              />
            </div>
          </Card>

          <Card class="flex flex-col gap-2" bgOpacity={opacity} bg={bg} size={size}>
            <div class="flex justify-center">CFG Scale</div>
            <div class="flex gap-1">
              <TextInput
                type="number"
                parentClass="w-32 h-8"
                prelabel="Init"
                onChange={props.updater(props.index, 'init.cfg')}
                value={props.item.init.cfg}
                variant="outline"
              />
              <TextInput
                type="number"
                parentClass="w-32 h-8"
                prelabel="Max"
                onChange={props.updater(props.index, 'limit.cfg')}
                value={props.item.limit.cfg}
                variant="outline"
              />
            </div>
          </Card>

          <Card class="flex flex-col gap-2" bgOpacity={opacity} bg={bg} size={size}>
            <div class="flex justify-center">Width</div>
            <div class="flex gap-1">
              <TextInput
                type="number"
                parentClass="w-32 h-8"
                prelabel="Init"
                onChange={props.updater(props.index, 'init.width')}
                value={props.item.init.width}
                variant="outline"
              />
              <TextInput
                type="number"
                parentClass="w-32 h-8"
                prelabel="Max"
                onChange={props.updater(props.index, 'limit.width')}
                value={props.item.limit.width}
                variant="outline"
              />
            </div>
          </Card>

          <Card class="flex flex-col gap-2" bgOpacity={opacity} bg={bg} size={size}>
            <div class="flex justify-center">Height</div>
            <div class="flex gap-1">
              <TextInput
                type="number"
                parentClass="w-32 h-8"
                prelabel="Init"
                onChange={props.updater(props.index, 'init.height')}
                value={props.item.init.height}
                variant="outline"
              />
              <TextInput
                type="number"
                parentClass="w-32 h-8"
                prelabel="Max"
                onChange={props.updater(props.index, 'limit.height')}
                value={props.item.limit.height}
                variant="outline"
              />
            </div>
          </Card>

          <Card class="flex flex-col gap-2" bgOpacity={opacity} bg={bg} size={size}>
            <div class="flex justify-center">Clip Skip</div>
            <div class="flex gap-1">
              <TextInput
                type="number"
                parentClass="w-32 h-8"
                prelabel="Init"
                onChange={props.updater(props.index, 'init.clipSkip')}
                value={props.item.init.clipSkip ?? 2}
                variant="outline"
              />
            </div>
          </Card>
        </div>
      </Card>
    </Accordian>
  )
}
