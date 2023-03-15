import { Component, JSX, For } from 'solid-js'
import { FormLabel } from './FormLabel'

export type DropdownItem<T extends string = string> = {
  label: string
  value: T
}

const Dropdown: Component<{
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
          class={`form-field rounded-xl bg-[var(--hl-700)] py-2 px-3 shadow-none `}
          onChange={onChange}
          disabled={props.disabled}
        >
          <For each={props.items}>
            {(item) => (
              <option
                class="bg-[var(--hl-500)])] border-0 border-none"
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
