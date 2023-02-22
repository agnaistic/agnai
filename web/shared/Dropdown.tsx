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
}> = (props) => {
  return (
    <div>
      <FormLabel label={props.label} helperText={props.helperText} />
      <div class={`overflow-hidden bg-transparent ${props.class}`}>
        <select
          name={props.fieldName}
          class="rounded-xl  bg-purple-600 py-2 px-3 shadow-none"
          multiple={props.multiple}
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
