import { JSX, Component, createMemo, createSignal, For, Show } from 'solid-js'
import { PresetOption } from './adapter'
import TextInput from './TextInput'
import { uniqBy } from '../../common/util'
import Select, { Option } from './Select'

export const PresetSelect: Component<{
  options: PresetOption[]
  setPresetId: (id: string) => void
  warning?: JSX.Element
  selected?: string
}> = (props) => {
  const version = 1

  const [filter, setFilter] = createSignal('')
  const custom = createMemo(() =>
    props.options.filter((o) => o.custom && o.label.toLowerCase().includes(filter().toLowerCase()))
  )
  const builtin = createMemo(() =>
    uniqBy(
      props.options.filter(
        (o) => !o.custom && o.label.toLowerCase().includes(filter().toLowerCase())
      ),
      // Remove pesky duplicate builtin Horde or it's difficult to know which
      // one the user selected
      (o) => o.value
    )
  )

  const combinedOptions = createMemo(() => {
    const list = custom()
      .concat(builtin())
      .map<Option>((value) => {
        const label = `${!value.custom ? `(Built-in) ` : ''}${value.label}`
        return {
          label,
          value: value.value,
        }
      })
      .filter((opt) => opt.label.toLowerCase().includes(filter()))

    return list
  })

  const selectedLabel = createMemo(() => {
    const selectedOption = props.options.find((o) => o.value === props.selected)
    return selectedOption === undefined
      ? 'None'
      : `${selectedOption.label} (${selectedOption.custom ? 'Custom' : 'Built-in'})`
  })
  return (
    <div class="flex flex-col gap-2 py-3 text-sm">
      <div class="text-lg">Preset</div>
      <div>
        Selected: <strong>{selectedLabel()}</strong>
      </div>

      <Show when={version === 1}>
        <Select
          items={combinedOptions()}
          fieldName="presetId"
          onChange={(item) => props.setPresetId(item.value)}
        />
      </Show>

      <Show when={version > 1}>
        <TextInput
          fieldName="__filter"
          placeholder="Type to filter presets..."
          onKeyUp={(e) => setFilter(e.currentTarget.value)}
        />
        <div class="flex flex-wrap gap-2 pr-3">
          <OptionList
            title="Custom"
            options={custom()}
            setPresetId={props.setPresetId}
            selected={props.selected}
          />
          <OptionList
            title="Built-in"
            options={builtin()}
            setPresetId={props.setPresetId}
            selected={props.selected}
          />
        </div>
      </Show>
      {props.warning ?? <></>}
    </div>
  )
}

const OptionList: Component<{
  options: PresetOption[]
  setPresetId: (id: string) => void
  title: string
  selected?: string
}> = (props) => (
  <div class="flex w-[48%] min-w-[190px] flex-col gap-2">
    <div class="text-md">{props.title}</div>
    <div class="flex max-h-52 flex-col gap-2 overflow-auto p-2">
      <For each={props.options}>
        {(option) => (
          <div
            class={
              (props.selected && props.selected === option.value
                ? 'bg-[var(--hl-800)]'
                : 'bg-700') + ' w-full cursor-pointer gap-4 rounded-xl py-1 px-2 text-sm'
            }
            onClick={() => props.setPresetId(option.value)}
          >
            <div class="font-bold">{option.label}</div>
          </div>
        )}
      </For>
    </div>
  </div>
)
