import { Component, createEffect, createMemo, createSignal, Show } from 'solid-js'
import { AlertTriangle, RefreshCw, Save, X } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { adaptersToOptions, getFormEntries, getStrictForm } from '../../shared/util'
import Dropdown, { DropdownItem } from '../../shared/Dropdown'
import {
  CHAT_ADAPTERS,
  ChatAdapter,
  HordeModel,
  HordeWorker,
  AIAdapter,
} from '../../../common/adapters'
import { settingStore, userStore } from '../../store'
import Divider from '../../shared/Divider'
import MultiDropdown from '../../shared/MultiDropdown'
import Modal from '../../shared/Modal'
import { DefaultPresets } from './DefaultPresets'
import { AppSchema } from '../../../srv/db/schema'
import UISettings from './UISettings'

type DefaultAdapter = Exclude<ChatAdapter, 'default'>

const adapterOptions = CHAT_ADAPTERS.filter((adp) => adp !== 'default') as DefaultAdapter[]

const Settings: Component = () => {
  const state = userStore()
  const cfg = settingStore()

  createEffect(() => {
    refreshHorde()
  })

  const [workers, setWorkers] = createSignal<DropdownItem[]>()
  const [show, setShow] = createSignal(false)

  const refreshHorde = () => {
    settingStore.getHordeModels()
    settingStore.getHordeWorkers()
  }

  const onSubmit = (evt: Event) => {
    const body = getStrictForm(evt, {
      koboldUrl: 'string?',
      novelApiKey: 'string?',
      novelModel: 'string?',
      hordeApiKey: 'string?',
      hordeModel: 'string?',
      luminaiUrl: 'string?',
      oaiKey: 'string?',
      scaleApiKey: 'string?',
      scaleUrl: 'string?',
      defaultAdapter: adapterOptions,
    } as const)

    const defaultPresets = getFormEntries(evt)
      .filter(([name]) => name.startsWith('preset.'))
      .map(([name, value]) => {
        return { adapter: name.replace('preset.', '') as AIAdapter, presetId: value }
      })
      .reduce((prev, curr) => {
        prev![curr.adapter] = curr.presetId
        return prev
      }, {} as AppSchema.User['defaultPresets'])

    userStore.updateConfig({
      ...body,
      hordeWorkers: workers()?.map((w) => w.value) || state.user?.hordeWorkers || [],
      defaultPresets,
    })
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

  return (
    <>
      <PageHeader title="Settings" subtitle="Configuration" />
      <form onSubmit={onSubmit}>
        <div class="flex flex-col gap-4">
          <UISettings />

          <Dropdown
            fieldName="defaultAdapter"
            label="Default AI Service"
            items={adaptersToOptions(cfg.config.adapters)}
            helperText="The default service conversations will use unless otherwise configured"
            value={state.user?.defaultAdapter}
          />

          <DefaultPresets />

          <Show when={cfg.config.adapters.includes('horde')}>
            <Divider />
            <h3 class="text-lg font-bold">AI Horde settings</h3>
            <TextInput
              fieldName="hordeApiKey"
              label="AI Horde API Key"
              helperText={HordeHelpText}
              placeholder={state.user?.hordeName ? 'API key has been verified' : ''}
              type="password"
            />

            <Show when={state.user?.hordeName}>
              <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('horde')}>
                Delete Horde API Key
              </Button>
            </Show>

            <div class="flex justify-between">
              <div class="w-fit">
                <Dropdown
                  fieldName="hordeModel"
                  helperText={<span>Currently set to: {state.user?.hordeModel || 'None'}</span>}
                  label="Horde Model"
                  value={state.user?.hordeModel}
                  items={[{ label: 'Any', value: '' }].concat(...cfg.models.map(toItem))}
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
          </Show>

          <Show when={cfg.config.adapters.includes('kobold')}>
            <Divider />
            <TextInput
              fieldName="koboldUrl"
              label="Kobold Compatible URL"
              helperText="Fully qualified URL. This URL must be publicly accessible."
              placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
              value={state.user?.koboldUrl}
            />
          </Show>

          <Show when={cfg.config.adapters.includes('openai')}>
            <Divider />
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
            />
            <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('openai')}>
              Delete OpenAI Key
            </Button>
          </Show>

          <Show when={cfg.config.adapters.includes('scale')}>
            <Divider />
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
            />
            <Button schema="red" class="w-max" onClick={() => userStore.deleteKey('scale')}>
              Delete Scale API Key
            </Button>
          </Show>

          <Show when={cfg.config.adapters.includes('novel')}>
            <Divider />
            <h3 class="text-xl">NovelAI settings</h3>
            <Dropdown
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
          </Show>
        </div>

        <Show when={cfg.config.adapters.includes('luminai')}>
          <Divider />
          <TextInput
            fieldName="luminaiUrl"
            label="LuminAI URL"
            helperText="Fully qualified URL. This URL must be publicly accessible."
            placeholder="E.g. https://local-tunnel-url-10-20-30-40.loca.lt"
            value={state.user?.luminaiUrl}
          />
        </Show>

        <Show when={!state.loggedIn}>
          <div class="mt-8 mb-4 flex w-full flex-col items-center justify-center">
            <div>This cannot be undone!</div>
            <Button class="bg-red-600" onClick={userStore.clearGuestState}>
              <AlertTriangle /> Delete Guest State <AlertTriangle />
            </Button>
          </div>
        </Show>
        <div class="flex justify-end gap-2 pt-4">
          <Button type="submit">
            <Save />
            Save
          </Button>
        </div>
        <WorkerModal show={show()} close={() => setShow(false)} save={setWorkers} />
      </form>
    </>
  )
}

export default Settings

const WorkerModal: Component<{
  show: boolean
  close: () => void
  save: (items: DropdownItem[]) => void
}> = (props) => {
  const cfg = settingStore((s) => ({
    workers: s.workers.slice().sort(sortWorkers).map(toWorkerItem),
  }))

  const state = userStore()

  const [selected, setSelected] = createSignal<DropdownItem[]>()

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

function toWorkerItem(wkr: HordeWorker): DropdownItem {
  return { label: `${wkr.name} - ${wkr.models[0]}`, value: wkr.id }
}
