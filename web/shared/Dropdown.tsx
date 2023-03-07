import { Component, JSX, Show, createSignal, For } from 'solid-js'
import { FormLabel } from './FormLabel'

export type DropdownItem = {
  label: string
  value: string
}

const Dropdown: Component<{
  multiple?: boolean
  fieldName: string
  label?: string
  helperText?: string | JSX.Element
  items: DropdownItem[]
  value?: string
  class?: string
  disabled?: boolean
  onChange?: (item: DropdownItem) => void
}> = (props) => {
  const onChange = (ev: Event & { currentTarget: EventTarget & HTMLSelectElement }) => {
    if (!props.onChange) return
    const item = props.items.find((item) => item.value === ev.currentTarget.value)
    props.onChange(item!)
  }

  return (
    <div>
      <FormLabel label={props.label} helperText={props.helperText} />
      <div class={`overflow-hidden bg-transparent ${props.class}`}>
        <select
          name={props.fieldName}
          class="rounded-xl bg-[var(--hl-700)] py-2 px-3 shadow-none"
          multiple={props.multiple}
          onChange={onChange}
          disabled={props.disabled}
        >
          <For each={props.items}>
            {(item) => (
              <option
                class="border-0 border-none bg-zinc-900"
                value={item.value}
                selected={props.value === item.value}
              >
                {item.label}
              </option>
            )}
          </For>
        </select>
      </div>
    </div>
  )
}

export default Dropdown
