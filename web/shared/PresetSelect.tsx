import { JSX, Component, createMemo, createSignal, For } from 'solid-js'
import { PresetOption } from './adapter'
import TextInput from './TextInput'
import { uniqBy } from '../../common/util'

export const PresetSelect: Component<{
  options: PresetOption[]
  setPresetId: (id: string) => void
  warning?: JSX.Element
  selected?: string
}> = (props) => {
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
