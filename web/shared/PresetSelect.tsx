import { JSX, Component, createMemo, createSignal, For, Show, createEffect, on } from 'solid-js'
import { PresetOption } from './adapter'
import TextInput from './TextInput'
import Button from './Button'
import Modal, { RootModal } from './Modal'
import { FormLabel } from './FormLabel'
import { exportPreset, presetStore, toastStore, userStore } from '../store'
import { DownloadIcon, PlusIcon } from 'lucide-solid'
import { AppSchema } from '/common/types'
import { createStore } from 'solid-js/store'
import { getStore } from '../store/create'
import { getProviderConnection } from '/common/providers'
import Select from './Select'
import { ManageProvider } from '../pages/Settings/Provider/Manage'
import { defaultPresets } from '/common/presets'

export const PresetSelect: Component<{
  label?: JSX.Element | string
  helperText?: JSX.Element | string
  fieldName?: string
  options: PresetOption[]
  setPresetId: (id: string) => void
  warning?: JSX.Element
  selected?: string
  children?: any
}> = (props) => {
  const [filter, setFilter] = createSignal('')
  const [newPreset, setNewPreset] = createSignal(false)
  const custom = createMemo(() =>
    props.options.filter((o) => o.custom && o.label.toLowerCase().includes(filter().toLowerCase()))
  )

  const presets = presetStore((s) => s.presets)
  const user = userStore((s) => ({ user: s.user }))

  const selectedLabel = createMemo(() => {
    const opt = props.options.find((o) => o.value === props.selected)
    return opt === undefined
      ? 'None'
      : opt.value === user.user?.defaultPreset
      ? `${opt.label} (Default)`
      : `${opt.label} ${opt.custom ? '' : '(Built-in)'}`
  })

  const [showSelectModal, setShowSelectModal] = createSignal(false)
  const selectIdAndCloseModal = (id: string) => {
    props.setPresetId?.(id)
    setShowSelectModal(false)
    setFilter('')
  }

  const downloadPreset = () => {
    const preset = presets.find((p) => p._id === props.selected)
    if (!preset) return

    exportPreset(preset)
  }

  return (
    <>
      <div class="flex flex-col text-sm">
        <Show
          when={props.label && props.helperText}
          fallback={<div class="text-lg">{props.label || ''}</div>}
        >
          <FormLabel label={props.label} helperText={props.helperText} />
        </Show>

        <Show when={props.fieldName}>
          <TextInput class="hidden" fieldName={props.fieldName!} value={props.selected} />
        </Show>

        <div class="flex w-full items-center gap-2">
          <Button onClick={() => setShowSelectModal(true)} class="w-fit">
            <strong>{selectedLabel()}</strong>
          </Button>

          <Button onClick={downloadPreset} disabled={!props.selected}>
            <DownloadIcon size={20} />
          </Button>

          <Show when={props.children}>{props.children}</Show>
        </div>

        {props.warning ?? <></>}
      </div>
      <RootModal
        show={showSelectModal()}
        close={() => setShowSelectModal(false)}
        title="Choose a Preset"
      >
        <div class="flex flex-col gap-4">
          <div class="sticky top-0">
            <TextInput
              placeholder="Type to filter presets..."
              onChange={(e) => setFilter(e.currentTarget.value)}
            />
          </div>
          <div class="flex flex-wrap gap-2">
            <div class="flex w-full justify-end px-2">
              <Button size="sm" onClick={() => setNewPreset(true)}>
                <PlusIcon size={16} />
                New
              </Button>
            </div>
            <OptionList
              options={custom()}
              onSelect={selectIdAndCloseModal}
              selected={props.selected}
            />
          </div>
        </div>
      </RootModal>

      <Show when={newPreset()}>
        <QuickNewPreset
          cancel={() => setNewPreset(false)}
          success={(preset) => {
            setNewPreset(false)
            props.setPresetId(preset._id)
          }}
        />
      </Show>
    </>
  )
}

const OptionList: Component<{
  options: PresetOption[]
  onSelect: (id: string) => void
  title?: string
  selected?: string
}> = (props) => (
  <div class={`flex w-full flex-col gap-2`}>
    <Show when={props.title}>
      <div class="text-md">{props.title}</div>
    </Show>
    <div class={`flex flex-col gap-2 p-2`}>
      <For each={props.options}>
        {(option) => (
          <div
            classList={{
              'bg-[var(--hl-800)]': props.selected === option.value,
              'bg-700': props.selected !== option.value,
            }}
            class={`w-full cursor-pointer gap-4 rounded-md px-2 py-1 text-sm`}
            onClick={() => props.onSelect(option.value)}
          >
            <div class="font-bold">{option.label}</div>
          </div>
        )}
      </For>
    </div>
  </div>
)

const QuickNewPreset: Component<{
  cancel: () => void
  success: (preset: AppSchema.UserGenPreset) => void
}> = (props) => {
  const providers = getStore('user')((s) => ({
    user: s.user,
    conns: (s.user?.providers || []).map(getProviderConnection),
  }))
  const [state, setState] = createStore({ name: '', providerId: '', loading: false })
  const [createdId, setCreatedId] = createSignal('')

  const options = createMemo(() => {
    const items = providers.conns
      .map((prv) => ({
        label: `${prv.name || prv.detail.name}`,
        value: prv.id,
      }))
      .sort((l, r) => l.label.localeCompare(r.label))

    items.unshift({ label: 'Select Provider', value: '' }, { label: 'New', value: 'new' })

    return items
  })

  const createPreset = async () => {
    if (state.providerId === 'new' || !state.providerId) {
      toastStore.warn(`Choose a Provider then try again`)
      return
    }

    setState('loading', true)

    try {
      await getStore('presets').createPreset(
        {
          ...defaultPresets.agnai,
          name: state.name || getEmptyPresetName(),
          providerId: state.providerId,
          providerModels: {},
          providerSettings: {},
        },
        (preset) => {
          props.success(preset)
        }
      )
    } finally {
      setState('loading', false)
    }
  }

  createEffect(
    on(
      () => options(),
      (next) => {
        const id = createdId()
        if (!id) return

        const match = next.find((n) => n.value === id)
        if (!match) return

        setState('providerId', id)
        setCreatedId('')
      }
    )
  )

  return (
    <>
      <Modal show close={props.cancel} title="New Preset">
        <div class="flex flex-col gap-2">
          <TextInput
            label="Preset Name"
            placeholder="Preset Name..."
            value={state.name}
            onChange={(ev) => setState('name', ev.currentTarget.value)}
          />
          <Select
            items={options()}
            label="Provider"
            value={state.providerId}
            onChange={(ev) => setState('providerId', ev.value)}
          />

          <div class="flex justify-center">
            <Button
              schema="success"
              disabled={!state.providerId || state.providerId === 'new'}
              onClick={createPreset}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
      <ManageProvider
        user={providers.user}
        close={(reason, prv) => {
          setState('providerId', prv?._id || '')
          setCreatedId(prv?._id || '')
        }}
        show={state.providerId === 'new'}
      />
    </>
  )
}

function getEmptyPresetName() {
  return `New - ${new Date().toLocaleString()}`
}
