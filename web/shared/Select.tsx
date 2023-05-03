import { Component, JSX, For, createMemo } from 'solid-js'
import { FormLabel } from './FormLabel'
import { ChevronDown } from 'lucide-solid'
import { AIAdapter } from '../../common/adapters'

export type Option<T extends string = string> = {
  label: string
  value: T
}

const Select: Component<{
  fieldName: string
  label?: string
  helperText?: string | JSX.Element
  items: Option[]
  value?: string
  class?: string
  disabled?: boolean
  onChange?: (item: Option) => void

  service?: AIAdapter
  adapters?: AIAdapter[] | readonly AIAdapter[]
}> = (props) => {
  const onChange = (ev: Event & { currentTarget: EventTarget & HTMLSelectElement }) => {
    if (!props.onChange) return
    const item = props.items.find((item) => item.value === ev.currentTarget.value)
    props.onChange(item!)
  }

  const hide = createMemo(() => {
    if (!props.service || !props.adapters) return ''
    return props.adapters.includes(props.service) ? '' : ` hidden `
  })

  return (
    <div class={hide()}>
      <FormLabel label={props.label} helperText={props.helperText} />
      <div class="flex items-center">
        <div class="relative overflow-hidden rounded-xl bg-transparent">
          <select
            name={props.fieldName}
            class={`form-field cursor-pointer appearance-none rounded-xl bg-[var(--hl-700)] py-2 pl-3 pr-8 shadow-none ${props.class}`}
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
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
            <ChevronDown />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Select
