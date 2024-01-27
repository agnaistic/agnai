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
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const HordeAISettings: Component<{
  onHordeWorkersChange: (workers: string[]) => void
  onHordeModelsChange: (models: string[]) => void
}> = (props) => {
  const [t] = useTransContext()

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
              {t('logged_in_as_x', { name: state.user.hordeName })}

              <Show when={!state.loading}>
                <a class="link" onClick={() => userStore.hordeStats()}>
                  {t('get_stats')}
                </a>
              </Show>
              <Show when={state.loading}>{t('loading')}</Show>
            </div>
            <Show when={state.stats}>
              <div>{t('kudos_x', { kudos: state.stats?.kudos.toLocaleString() })}</div>
            </Show>
          </div>
        )
      return t('currently_using_anonymous_access')
    },
    { equals: false }
  )

  const HordeHelpText = (
    <>
      <span>{hordeName()}</span>
      <br />
      <span>
        <Trans key="horde_help_text">
          Leave blank to use guest account. Visit
          <a class="link" href="https://aihorde.net" target="_blank">
            stablehorde.net
          </a>
          to register.
        </Trans>
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
        label={t('use_trusted_workers_only')}
        value={state.user?.hordeUseTrusted ?? true}
        helperText={t('this_may_help_reduce_bad_responses')}
      />
      <TextInput
        fieldName="hordeKey"
        label={t('ai_horde_api_key')}
        helperText={HordeHelpText}
        placeholder={
          state.user?.hordeName || state.user?.hordeKey ? t('api_key_has_been_verified') : ''
        }
        type="password"
        value={state.user?.hordeKey}
      />

      <Show when={state.user?.hordeName}>
        <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('horde')}>
          {t('delete_horde_api_key')}
        </Button>
      </Show>

      <div class="flex items-start gap-4">
        <Button onClick={() => setShowModels(true)} class="min-w-max">
          {t('select_models')}
        </Button>
        <div class="flex flex-wrap gap-2 text-sm">
          <For each={selectedModels()}>{(model) => <Pill inverse>{model}</Pill>}</For>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <Button onClick={() => setShow(true)}>{t('select_workers')}</Button>
        <div>{t('workers_selected_x', { workers: workers()?.length ?? state.workers.length })}</div>
      </div>

      <ModelModal show={showModels()} close={() => setShowModels(false)} save={onSaveHordeModels} />
      <WorkerModal show={show()} close={() => setShow(false)} save={onSaveHordeWorkers} />
    </>
  )
}

export default HordeAISettings

export const HordeDetails: Component<{ maxTokens: number; maxContextLength: number }> = (props) => {
  const [t] = useTransContext()

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
      <div class="text-lg font-bold">{t('horde_status')}</div>
      {t('number_of_horde_workers_that_match_your_preset', {
        count: status().matches.length,
        total: cfg.workers.length,
        max_tokens: props.maxTokens,
        max_content_length: props.maxContextLength,
        status: status().excluded,
      })}
    </>
  )
}

const ModelModal: Component<{
  show: boolean
  close: () => void
  save: (items: Option[]) => void
}> = (props) => {
  const [t] = useTransContext()

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
        title={t('specify_ai_horde_models')}
        footer={
          <>
            <Button schema="secondary" onClick={props.close}>
              <X /> {t('cancel')}
            </Button>
            <Button onClick={save}>
              <Save /> {t('select_model')}
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-4 text-sm">
          <MultiDropdown
            class="min-h-[6rem]"
            fieldName="workers"
            items={cfg.models}
            label={t('select_models')}
            onChange={setSelected}
            values={selected()?.map((s) => s.value) || state.models}
          />
          <div class="flex items-center justify-between gap-4">
            <div>
              {t('models_selected', { model: selected()?.length || state.models.length || '0' })}
            </div>
            <Button schema="gray" class="w-max" onClick={() => setSelected([])}>
              {t('deselect_all')}
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
  const [t] = useTransContext()

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
        title={t('specify_ai_horde_workers')}
        footer={
          <>
            <Button schema="secondary" onClick={props.close}>
              <X /> {t('cancel')}
            </Button>
            <Button onClick={save}>
              <Save /> {t('select_workers')}
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-4 text-sm">
          <MultiDropdown
            fieldName="workers"
            items={cfg.workers}
            label={t('select_workers')}
            helperText={t('to_use_any_worker_deselect_all_workers')}
            onChange={setSelected}
            values={selected()?.map((s) => s.value) || state.user?.hordeWorkers || []}
          />
          <div>
            <Trans key="the_number_shown_in_brackets_are_the_worker">
              The number showns in brackets are the worker's <b>Max Context Length / Max Tokens</b>
              limits. If you wish to use that worker, your preset should not exceed these values.
              E.g. <b>(1024/80)</b>
            </Trans>
          </div>
          <div class="flex items-center justify-between gap-4">
            <p>
              {t('workers_selected_x', {
                workers: selected()?.length || state.user?.hordeWorkers?.length || '0',
              })}
            </p>
            <Button schema="gray" class="w-max" onClick={() => setSelected([])}>
              {t('deselect_all')}
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
