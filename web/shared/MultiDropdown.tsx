import { Component, JSX, For } from 'solid-js'
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
  multiple?: boolean
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
      <div class="max-h-64 w-full overflow-auto p-2">
        <select
          name={props.fieldName}
          class={`form-field h-max overflow-y-auto rounded-sm bg-[var(--hl-700)] shadow-none ${
            props.class || ''
          }`}
          multiple={props.multiple ?? true}
          onChange={onChange}
          disabled={props.disabled}
          size={Math.max(props.items.length, 5)}
        >
          <For each={props.items}>
            {(item) => (
              <option
                class="h-6 border-0 border-none bg-[var(--hl-700)]"
                value={item.value}
                selected={props.values?.includes(item.value)}
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

export default MultiDropdown
