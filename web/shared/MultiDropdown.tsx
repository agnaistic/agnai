import { Component, JSX, For, Show } from 'solid-js'
import { FormLabel } from './FormLabel'

export type DropdownItem = {
  label: string
  value: string
}

const MultiDropdown: Component<{
  fieldName: string
  label?: string
  helperText?: string | JSX.Element
  items: DropdownItem[]
  values?: string[]
  class?: string
  disabled?: boolean
  onChange?: (selected: DropdownItem[]) => void
}> = (props) => {
  const onChange = (ev: Event & { currentTarget: EventTarget & HTMLSelectElement }) => {
    const selected: DropdownItem[] = []

    for (let i = 0; i < props.items.length; i++) {
      const opt = ev.currentTarget.children[i] as HTMLOptionElement
      if (!opt.selected) continue
      selected.push(props.items[i])
    }

    props.onChange?.(selected)
  }

  return (
    <div>
      <FormLabel label={props.label} helperText={props.helperText} />
      {/* <div class={`h-max bg-[var(--hl-700)] ${props.class || ''} rounded-xl py-4 px-2`}> */}
      <select
        name={props.fieldName}
        class={`h-max rounded-sm bg-[var(--hl-700)] p-2 shadow-none`}
        multiple
        onChange={onChange}
        disabled={props.disabled}
      >
        <For each={props.items}>
          {(item) => (
            <option
              class="border-0 border-none bg-[var(--hl-700)] "
              value={item.value}
              selected={props.values?.includes(item.value)}
            >
              {item.label}
            </option>
          )}
        </For>
      </select>
    </div>
    // </div>
  )
}

export default MultiDropdown
