import { Component, For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { settingStore, userStore } from '../../../store'
import Button from '../../../shared/Button'
import { Option } from '../../../shared/Select'
import { Save, X } from 'lucide-solid'
import Modal from '../../../shared/Modal'
import MultiDropdown from '../../../shared/MultiDropdown'
import { HordeModel, HordeWorker } from '../../../../common/adapters'
import { Toggle } from '../../../shared/Toggle'
import { toArray } from '/common/util'
import { rootModalStore } from '/web/store/root-modal'
import { Pill } from '/web/shared/Card'

const HordeAISettings: Component<{
  onHordeWorkersChange: (workers: string[]) => void
  onHordeModelsChange: (models: string[]) => void
}> = (props) => {
  const state = userStore((s) => ({
    workers: toArray(s.user?.hordeWorkers),
    models: toArray(s.user?.hordeModel),
    user: s.user,
    stats: s.metadata?.hordeStats,
    loading: s.hordeStatsLoading,
  }))

  const [workers, setWorkers] = createSignal<Option[]>()
  const [models, setModels] = createSignal<Option[]>()
  const [showModels, setShowModels] = createSignal(false)
  const [show, setShow] = createSignal(false)

  const selectedModels = createMemo(() => {
    const selected = models()
    if (selected?.length) {
      return selected.map((m) => m.value)
    }

    if (!state.models.length) {
      return ['Any']
    }

    return state.models
  })

  const onSaveHordeModels = (options: Option[]) => {
    setModels(options)
    props.onHordeModelsChange(options.map((o) => o.value))
  }

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
      if (state.user?.hordeName)
        return (
          <div class="flex flex-col">
            <div>
              Logged in as {state.user.hordeName}.{' '}
              <Show when={!state.loading}>
                <a class="link" onClick={() => userStore.hordeStats()}>
                  Get stats
                </a>
              </Show>
              <Show when={state.loading}>Loading...</Show>
            </div>
            <Show when={state.stats}>
              <div>Kudos: {state.stats?.kudos.toLocaleString()}</div>
            </Show>
          </div>
        )
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

      <div class="flex items-start gap-4">
        <Button onClick={() => setShowModels(true)} class="min-w-max">
          Select Models
        </Button>
        <div class="flex flex-wrap gap-2 text-sm">
          <For each={selectedModels()}>{(model) => <Pill inverse>{model}</Pill>}</For>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <Button onClick={() => setShow(true)}>Select Workers</Button>
        <div>Workers selected: {workers()?.length ?? state.workers.length}</div>
      </div>

      <ModelModal show={showModels()} close={() => setShowModels(false)} save={onSaveHordeModels} />
      <WorkerModal show={show()} close={() => setShow(false)} save={onSaveHordeWorkers} />
    </>
  )
}

export default HordeAISettings

export const HordeDetails: Component<{ maxTokens: number; maxContextLength: number }> = (props) => {
  const user = userStore()
  const cfg = settingStore((c) => c.config.horde)

  const status = createMemo(() => {
    const m = new Set(
      Array.isArray(user.user?.hordeModel)
        ? user.user?.hordeModel
        : !!user.user?.hordeModel && user.user.hordeModel !== 'any'
        ? [user.user?.hordeModel]
        : []
    )
    const w = new Set(user.user?.hordeWorkers || [])

    let excluded = 0
    let unwanted = 0

    const matches = cfg.workers.filter((wrk) => {
      if (m.size > 0) {
        if (!wrk.models.some((model) => m.has(model))) {
          unwanted++
          return false
        }
      }

      if (w.size > 0) {
        if (!w.has(wrk.id)) {
          unwanted++
          return false
        }
      }

      if (props.maxTokens > wrk.max_length) {
        excluded++
        return false
      }
      if (props.maxContextLength! > wrk.max_context_length) {
        excluded++
        return false
      }
      return true
    })

    return { matches, unwanted, excluded }
  })

  return (
    <>
      <div class="text-lg font-bold">Horde Status</div>
      Number of Horde Workers that match your preset: {status().matches.length} /{' '}
      {cfg.workers.length}.<br />
      Workers excluded by your Max Tokens ({props.maxTokens}) / Max Context Length (
      {props.maxContextLength}): {status().excluded}
    </>
  )
}

const ModelModal: Component<{
  show: boolean
  close: () => void
  save: (items: Option[]) => void
}> = (props) => {
  const cfg = settingStore((s) => ({
    models: s.models.slice().map(toItem),
  }))

  const state = userStore((s) => ({
    models: toArray(s.user?.hordeModel),
  }))

  const [selected, setSelected] = createSignal<Option[]>()

  const save = () => {
    if (selected()) {
      props.save(selected()!)
    }
    props.close()
  }

  rootModalStore.addModal({
    id: 'horde-models',
    element: (
      <Modal
        show={props.show}
        close={props.close}
        title="Specify AI Horde Models"
        footer={
          <>
            <Button schema="secondary" onClick={props.close}>
              <X /> Cancel
            </Button>
            <Button onClick={save}>
              <Save /> Select Model(s)
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-4 text-sm">
          <MultiDropdown
            class="min-h-[6rem]"
            fieldName="workers"
            items={cfg.models}
            label="Select Model(s)"
            onChange={setSelected}
            values={selected()?.map((s) => s.value) || state.models}
          />
          <div class="flex items-center justify-between gap-4">
            <div>Models selected: {selected()?.length || state.models.length || '0'}</div>
            <Button schema="gray" class="w-max" onClick={() => setSelected([])}>
              De-select All
            </Button>
          </div>
        </div>
      </Modal>
    ),
  })

  return null
}

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

  rootModalStore.addModal({
    id: 'horde-workers',
    element: (
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
          <div>
            The number showns in brackets are the worker's <b>Max Context Length / Max Tokens</b>{' '}
            limits. If you wish to use that worker, your preset should not exceed these values.
            <br />
            E.g. <b>(1024/80)</b>
          </div>
          <div class="flex  items-center justify-between gap-4">
            <p>Workers selected: {selected()?.length || state.user?.hordeWorkers?.length || '0'}</p>
            <Button schema="gray" class="w-max" onClick={() => setSelected([])}>
              De-select All
            </Button>
          </div>
        </div>
      </Modal>
    ),
  })

  return null
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
  const extras: string[] = []
  if (wkr.max_context_length) extras.push(`${wkr.max_context_length}`)
  if (wkr.max_length) extras.push(`${wkr.max_length}`)

  const maxes = extras.length ? `- (${extras.join('/')}) ` : ''
  return { label: `${wkr.name} ${maxes}- ${wkr.models[0]}`, value: wkr.id }
}
