import { Component, createEffect, createMemo, createSignal, Show } from 'solid-js'
import { AlertTriangle, RefreshCw, Save, X } from 'lucide-solid'
import Button from '../../shared/Button'
import TextInput from '../../shared/TextInput'
import { adaptersToOptions } from '../../shared/util'
import Select, { Option } from '../../shared/Select'
import {
  ADAPTER_LABELS,
  HordeModel,
  HordeWorker,
} from '../../../common/adapters'
import { settingStore, userStore } from '../../store'
import Divider from '../../shared/Divider'
import MultiDropdown from '../../shared/MultiDropdown'
import Modal from '../../shared/Modal'
import Tabs from '../../shared/Tabs'

const AISettings: Component<{
  onHordeWorkersChange: (workers: string[]) => void
}> = (props) => {
  const state = userStore()
  const cfg = settingStore()

  createEffect(() => {
    refreshHorde()
    console.log(cfg.config.adapters)
    setTabs(cfg.config.adapters.map(a => ADAPTER_LABELS[a] || a))
  })

  const [workers, setWorkers] = createSignal<Option[]>()
  const [show, setShow] = createSignal(false)
  const [tabs, setTabs] = createSignal<string[]>([])
  const [tab, setTab] = createSignal(0)

  const currentTab = createMemo(() => cfg.config.adapters[tab()])

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

  const novelVerified = createMemo(
    () => (state.user?.novelVerified ? 'API Key has been verified' : ''),
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

  const tabClass = `flex flex-col gap-4`

  return (
    <>
      <Select
        fieldName="defaultAdapter"
        label="Default AI Service"
        items={adaptersToOptions(cfg.config.adapters)}
        helperText="The default service conversations will use unless otherwise configured"
        value={state.user?.defaultAdapter}
      />

      <div class="my-2">
        <Tabs tabs={tabs()} selected={tab} select={setTab} />
      </div>

      <div class={currentTab() === 'horde' ? tabClass : 'hidden'}>
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
          <div>
            Workers selected: {workers()?.length ?? state.user?.hordeWorkers?.length ?? '0'}
          </div>
        </div>
      </div>

      <div class={currentTab() === 'kobold' ? tabClass : 'hidden'}>
        <TextInput
          fieldName="koboldUrl"
          label="Kobold Compatible URL"
          helperText="Fully qualified URL. This URL must be publicly accessible."
          placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
          value={state.user?.koboldUrl}
        />
      </div>

      <div class={currentTab() === 'openai' ? tabClass : 'hidden'}>
        <TextInput
          fieldName="oaiKey"
          label="OpenAI Key"
          helperText="Valid OpenAI Key."
          placeholder={
            state.user?.oaiKeySet
              ? 'OpenAI key is set'
              : 'E.g. sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
          }
          type="password"
          value={state.user?.oaiKey}
        />
        <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('openai')}>
          Delete OpenAI Key
        </Button>
      </div>

      <div class={currentTab() === 'scale' ? tabClass : 'hidden'}>
        <TextInput
          fieldName="scaleUrl"
          label="Scale URL"
          helperText="Fully qualified Scale URL."
          placeholder={'E.g. https://dashboard.scale.com/spellbook/api/v2/deploy/a1b2c3'}
          value={state.user?.scaleUrl}
        />
        <TextInput
          fieldName="scaleApiKey"
          label="Scale API Key"
          placeholder={
            state.user?.scaleApiKeySet
              ? 'Scale API key is set'
              : 'E.g. 9rv440nv7ogj6s7j312flqijd'
          }
          type="password"
          value={state.user?.scaleApiKey}
        />
        <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('scale')}>
          Delete Scale API Key
        </Button>
      </div>

      <div class={currentTab() === 'novel' ? tabClass : 'hidden'}>
        <Select
          fieldName="novelModel"
          label="NovelAI Model"
          items={[
            { label: 'Euterpe', value: 'euterpe-v2' },
            { label: 'Krake', value: 'krake-v2' },
          ]}
          value={state.user?.novelModel}
        />
        <TextInput
          fieldName="novelApiKey"
          label="Novel API Key"
          type="password"
          value={state.user?.novelApiKey}
          helperText={
            <>
              NEVER SHARE THIS WITH ANYBODY! The token from the NovelAI request authorization.
              Please note that this token expires periodically. You will occasionally need to
              re-enter this token. headers.{' '}
              <a
                class="link"
                target="_blank"
                href="https://github.com/luminai-companion/agn-ai/blob/dev/instructions/novel.md"
              >
                Instructions
              </a>
              .
            </>
          }
          placeholder={novelVerified()}
        />
        <Show when={state.user?.novelVerified}>
          <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('novel')}>
            Delete Novel API Key
          </Button>
        </Show>
      </div>

      <div class={currentTab() === 'luminai' ? tabClass : 'hidden'}>
        <TextInput
          fieldName="luminaiUrl"
          label="LuminAI URL"
          helperText="Fully qualified URL. This URL must be publicly accessible."
          placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
          value={state.user?.luminaiUrl}
        />
      </div>

      <WorkerModal show={show()} close={() => setShow(false)} save={onSaveHordeWorkers} />
    </>
  )
}

export default AISettings

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
