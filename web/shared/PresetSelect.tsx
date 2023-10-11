import { JSX, Component, createMemo, createSignal, For, Show } from 'solid-js'
import { PresetOption } from './adapter'
import TextInput from './TextInput'
import { uniqBy } from '../../common/util'
import { useRootModal } from './hooks'
import Button from './Button'
import Modal from './Modal'
import { FormLabel } from './FormLabel'
import { settingStore, userStore } from '../store'
import { isUsableService } from './util'
import { defaultPresets } from '/common/default-preset'
import { isDefaultPreset } from '/common/presets'

export const PresetSelect: Component<{
  label?: JSX.Element | string
  helperText?: JSX.Element | string
  fieldName?: string
  options: PresetOption[]
  setPresetId: (id: string) => void
  warning?: JSX.Element
  selected?: string
}> = (props) => {
  const [filter, setFilter] = createSignal('')
  const custom = createMemo(() =>
    props.options.filter((o) => o.custom && o.label.toLowerCase().includes(filter().toLowerCase()))
  )
  const config = settingStore((s) => s.config)
  const user = userStore((s) => ({ user: s.user }))

  const builtin = createMemo(() =>
    uniqBy(
      props.options.filter((o) => {
        if (o.custom) return false
        if (!o.value) return true
        if (!isDefaultPreset(o.value)) return false
        const preset = defaultPresets[o.value]
        if (!isUsableService(preset.service, config, user.user)) return false
        return o.label.toLowerCase().includes(filter().toLowerCase())
      }),
      // Remove pesky duplicate builtin Horde or it's difficult to know which
      // one the user selected
      (o) => o.value
    )
  )

  const selectedLabel = createMemo(() => {
    const selectedOption = props.options.find((o) => o.value === props.selected)
    return selectedOption === undefined
      ? 'None'
      : `${selectedOption.label} (${selectedOption.custom ? 'Custom' : 'Built-in'})`
  })
  const [showSelectModal, setShowSelectModal] = createSignal(false)
  const selectIdAndCloseModal = (id: string) => {
    props.setPresetId(id)
    setShowSelectModal(false)
    setFilter('')
  }
  useRootModal({
    id: 'presetSelect',
    element: (
      <Modal
        show={showSelectModal()}
        close={() => setShowSelectModal(false)}
        title="Choose a preset"
      >
        <div class="flex flex-col gap-4">
          <div class="sticky top-0">
            <TextInput
              fieldName="__filter"
              placeholder="Type to filter presets..."
              onKeyUp={(e) => setFilter(e.currentTarget.value)}
            />
          </div>
          <div class="flex flex-wrap gap-2 pr-3">
            <h4>Custom presets</h4>
            <OptionList
              options={custom()}
              onSelect={selectIdAndCloseModal}
              selected={props.selected}
            />
            <h4>Built-in presets</h4>
            <OptionList
              options={builtin()}
              onSelect={selectIdAndCloseModal}
              selected={props.selected}
            />
          </div>
        </div>
      </Modal>
    ),
  })

  return (
    <div class="flex flex-col gap-2 py-3 text-sm">
      <Show
        when={props.label && props.helperText}
        fallback={<div class="text-lg">{props.label || ''}</div>}
      >
        <FormLabel label={props.label} helperText={props.helperText} />
      </Show>

      <Show when={props.fieldName}>
        <TextInput class="hidden" fieldName={props.fieldName!} value={props.selected} />
      </Show>

      <div class="inline-block">
        <Button onClick={() => setShowSelectModal(true)}>
          Selected: <strong>{selectedLabel()}</strong>
        </Button>
      </div>

      {props.warning ?? <></>}
    </div>
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
            class={
              (props.selected && props.selected === option.value
                ? 'bg-[var(--hl-800)]'
                : 'bg-700') + ` w-full cursor-pointer gap-4 rounded-md px-2 py-1 text-sm`
            }
            onClick={() => props.onSelect(option.value)}
          >
            <div class="font-bold">{option.label}</div>
          </div>
        )}
      </For>
    </div>
  </div>
)
