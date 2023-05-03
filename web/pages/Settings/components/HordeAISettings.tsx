import { Component, Show, createEffect, createMemo, createSignal } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { settingStore, toastStore, userStore } from '../../../store'
import Button from '../../../shared/Button'
import Select, { Option } from '../../../shared/Select'
import { RefreshCw, Save, X } from 'lucide-solid'
import Modal from '../../../shared/Modal'
import MultiDropdown from '../../../shared/MultiDropdown'
import { HordeModel, HordeWorker } from '../../../../common/adapters'
import { Toggle } from '../../../shared/Toggle'

const HordeAISettings: Component<{
  onHordeWorkersChange: (workers: string[]) => void
}> = (props) => {
  const state = userStore()
  const cfg = settingStore()

  const [workers, setWorkers] = createSignal<Option[]>()
  const [show, setShow] = createSignal(false)

  const onSaveHordeWorkers = (options: Option[]) => {
    setWorkers(options)
    props.onHordeWorkersChange(options.map((o) => o.value))
  }

  const refreshHorde = () => {
    settingStore.getHordeModels()
    settingStore.getHordeWorkers()
  }

  const hordeName = createMemo(
    () => {
      if (state.user?.hordeName) return `Logged in as ${state.user.hordeName}.`
      return `Currently using anonymous access.`
    },
    { equals: false }
  )

  const HordeHelpText = (
    <>
      <span>{hordeName()}</span>
      <br />
      <span>
        Leave blank to use guest account. Visit{' '}
        <a class="link" href="https://aihorde.net" target="_blank">
          stablehorde.net
        </a>{' '}
        to register.
      </span>
    </>
  )

  createEffect(() => {
    refreshHorde()
  })

  return (
    <>
      <Toggle
        fieldName="hordeUseTrusted"
        label="Use Trusted Workers Only"
        value={state.user?.hordeUseTrusted ?? true}
        helperText="This may help reduce 'bad responses' by using only 'trusted' workers. Warning: This may increase response times."
      />
      <TextInput
        fieldName="hordeKey"
        label="AI Horde API Key"
        helperText={HordeHelpText}
        placeholder={
          state.user?.hordeName || state.user?.hordeKey ? 'API key has been verified' : ''
        }
        type="password"
        value={state.user?.hordeKey}
      />

      <Show when={state.user?.hordeName}>
        <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('horde')}>
          Delete Horde API Key
        </Button>
      </Show>

      <div class="flex justify-between">
        <div class="w-fit">
          <Select
            fieldName="hordeModel"
            helperText={<span>Currently set to: {state.user?.hordeModel || 'None'}</span>}
            label="Horde Model"
            value={state.user?.hordeModel}
            items={[{ label: 'Any', value: 'any' }].concat(...cfg.models.map(toItem))}
          />
        </div>
        <div class="icon-button flex items-center" onClick={refreshHorde}>
          <RefreshCw />
        </div>
      </div>
      <div class="flex items-center gap-4">
        <Button onClick={() => setShow(true)}>Select Specific Workers</Button>
        <div>Workers selected: {workers()?.length ?? state.user?.hordeWorkers?.length ?? '0'}</div>
      </div>

      <WorkerModal show={show()} close={() => setShow(false)} save={onSaveHordeWorkers} />
    </>
  )
}

export default HordeAISettings

const WorkerModal: Component<{
  show: boolean
  close: () => void
  save: (items: Option[]) => void
}> = (props) => {
  const cfg = settingStore((s) => ({
    workers: s.workers.slice().sort(sortWorkers).map(toWorkerItem),
  }))

  const state = userStore()

  const [selected, setSelected] = createSignal<Option[]>()

  const save = () => {
    if (selected()) {
      props.save(selected()!)
    } else if (state.user?.hordeWorkers) {
      props.save(cfg.workers.filter((w) => state.user?.hordeWorkers!.includes(w.value)))
    }

    props.close()
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title="Specify AI Horde Workers"
      footer={
        <>
          <Button schema="secondary" onClick={props.close}>
            <X /> Cancel
          </Button>
          <Button onClick={save}>
            <Save /> Select Workers
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-4 text-sm">
        <MultiDropdown
          fieldName="workers"
          items={cfg.workers}
          label="Select Workers"
          helperText="To use any worker de-select all workers"
          onChange={setSelected}
          values={selected()?.map((s) => s.value) || state.user?.hordeWorkers || []}
        />
        <div class="flex items-center justify-between gap-4">
          <div>
            Workers selected: {selected()?.length || state.user?.hordeWorkers?.length || '0'}
          </div>
          <Button schema="gray" class="w-max" onClick={() => setSelected([])}>
            De-select All
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function toItem(model: HordeModel) {
  return {
    label: `${model.name} - (queue: ${model.queued}, eta: ${model.eta}, count: ${model.count})`,
    value: model.name,
  }
}

function sortWorkers({ models: l }: HordeWorker, { models: r }: HordeWorker) {
  return l[0] > r[0] ? 1 : l[0] === r[0] ? 0 : -1
}

function toWorkerItem(wkr: HordeWorker): Option {
  return { label: `${wkr.name} - ${wkr.models[0]}`, value: wkr.id }
}
