import { Component, JSX, For, createMemo, Show, createEffect, on } from 'solid-js'
import { FormLabel } from './FormLabel'
import { ChevronDown } from 'lucide-solid'

export type Option<T extends string = string> = {
  label: string
  value: T
}

const Select: Component<{
  fieldName?: string
  label?: JSX.Element | string
  helperText?: string | JSX.Element
  helperMarkdown?: string
  items: Option[]
  value?: string
  class?: string
  disabled?: boolean
  classList?: Record<string, boolean>
  parentClass?: string
  onChange?: (item: Option) => void
  recommend?: string
  recommendLabel?: string

  ref?: (ref: HTMLSelectElement) => void
  hide?: boolean
}> = (props) => {
  let ref: any
  const onChange = (ev: Event & { currentTarget: EventTarget & HTMLSelectElement }) => {
    if (props.onChange) {
      const item = props.items.find((item) => item.value === ev.currentTarget.value)
      props.onChange(item!)
    }
  }

  createEffect(
    on(
      () => props.value,
      (next) => {
        if (next === undefined) return
        if (!ref) return
        ref.value = next
      }
    )
  )

  const recommend = createMemo(() => {
    if (!props.recommend) return
    const item = props.items.find((i) => i.value === props.recommend)
    return item ? item.label : props.recommend
  })

  return (
    <div
      class={`max-w-full ${props.parentClass || ''}`}
      classList={{
        ...props.classList,
        hidden: props.hide ?? false,
      }}
    >
      <FormLabel
        label={
          <span>
            <label class="form-label">{props.label}</label>
            <Show when={recommend() !== undefined}>
              <span class="text-xs italic text-gray-500">
                &nbsp;({props.recommendLabel || 'Recommended'}: {recommend()?.toString()})
              </span>
            </Show>
          </span>
        }
        helperText={props.helperText}
        helperMarkdown={props.helperMarkdown}
      />

      <div class="flex items-center">
        <div class="relative overflow-hidden rounded-xl bg-transparent">
          <select
            ref={(ele) => {
              ref = ele
              props.ref?.(ele)
            }}
            name={props.fieldName}
            class={`form-field cursor-pointer appearance-none rounded-xl bg-[var(--hl-700)] py-2 pl-3 pr-8 shadow-none ${
              props.class || ''
            }`}
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
