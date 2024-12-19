import { Component, For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import TextInput from '../../../shared/TextInput'
import { settingStore, userStore } from '../../../store'
import Button from '../../../shared/Button'
import { Option } from '../../../shared/Select'
import { Save, X } from 'lucide-solid'
import { RootModal } from '../../../shared/Modal'
import MultiDropdown from '../../../shared/MultiDropdown'
import { HordeModel, HordeWorker } from '../../../../common/adapters'
import { Toggle } from '../../../shared/Toggle'
import { toArray } from '/common/util'
import { Pill } from '/web/shared/Card'
import { SetStoreFunction } from 'solid-js/store'
import { AppSchema } from '/common/types'

const HordeAISettings: Component<{
  state: AppSchema.User
  setter: SetStoreFunction<AppSchema.User>
}> = (props) => {
  const state = userStore((s) => ({
    stats: s.metadata?.hordeStats,
    loading: s.hordeStatsLoading,
  }))

  const models = createMemo(() => toArray(props.state.hordeModel))
  const workers = createMemo(() => toArray(props.state.hordeWorkers))

  const [showModels, setShowModels] = createSignal(false)
  const [show, setShow] = createSignal(false)

  const selectedModels = createMemo(() => {
    const selected = models()
    if (selected.length) {
      return selected
    }

    if (!selected.length) {
      return ['Any']
    }

    return selected
  })

  const onSaveHordeModels = (options: Option[]) => {
    props.setter(
      'hordeModel',
      options.map((o) => o.value)
    )
  }

  const onSaveHordeWorkers = (options: Option[]) => {
    props.setter(
      'hordeWorkers',
      options.map((o) => o.value)
    )
  }

  const refreshHorde = () => {
    settingStore.getHordeModels()
    settingStore.getHordeWorkers()
  }

  const hordeName = createMemo(
    () => {
      if (props.state.hordeName)
        return (
          <div class="flex flex-col">
            <div>
              Logged in as {props.state.hordeName}.{' '}
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
          aihorde.net
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
        value={props.state.hordeUseTrusted ?? true}
        helperText="This may help reduce 'bad responses' by using only 'trusted' workers. Warning: This may increase response times."
        onChange={(ev) => props.setter('hordeUseTrusted', ev)}
      />
      <TextInput
        fieldName="hordeKey"
        label="AI Horde API Key"
        helperText={HordeHelpText}
        placeholder={
          props.state.hordeName || props.state.hordeKey ? 'API key has been verified' : ''
        }
        type="password"
        onChange={(ev) => props.setter('hordeKey', ev.currentTarget.value)}
      />

      <Show when={props.state.hordeName}>
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
        <div>Workers selected: {workers().length}</div>
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

  return (
    <RootModal
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
    </RootModal>
  )
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

  return (
    <RootModal
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
    </RootModal>
  )
}

function toItem(model: HordeModel) {
  return {
    label: `${model.name} - (count: ${model.count}, queue: ${model.queued}, eta: ${model.eta})`,
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
