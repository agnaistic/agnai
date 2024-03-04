import { Component, For, JSX, Show, createMemo } from 'solid-js'
import { FormLabel } from './FormLabel'
import './toggle.css'
import { AIAdapter, PresetAISettings, ThirdPartyFormat } from '../../common/adapters'
import { isValidServiceSetting } from './util'
import { Option } from './Select'

export const Toggle: Component<{
  fieldName: string
  value?: boolean
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  helperMarkdown?: string
  class?: string
  onChange?: (value: boolean) => void
  disabled?: boolean
  reverse?: boolean
  service?: AIAdapter
  format?: ThirdPartyFormat
  aiSetting?: keyof PresetAISettings
  classList?: Record<string, boolean>
}> = (props) => {
  let ref: HTMLInputElement
  const onChange = (ev: Event & { currentTarget: HTMLInputElement }) => {
    if (props.disabled) return
    const checked = !!ev.currentTarget.checked
    ref.checked = checked
    props.onChange?.(checked)
  }

  const hide = createMemo(() => {
    const isValid = isValidServiceSetting(props.service, props.format, props.aiSetting)
    return isValid ? '' : ' hidden'
  })

  const justify = createMemo(() => (props.reverse ? 'sm:justify-start' : 'sm:justify-between'))

  return (
    <div
      class={`sm: flex flex-col gap-2 sm:flex-row ${hide()} sm:items-center ${justify()}`}
      classList={props.classList}
    >
      <Show when={props.label && !props.reverse}>
        <FormLabel
          label={props.label}
          helperText={props.helperText}
          helperMarkdown={props.helperMarkdown}
        />
      </Show>
      <label class={`toggle ${props.disabled ? 'toggle-disabled' : ''}`}>
        <input
          ref={ref!}
          type="checkbox"
          class="toggle-checkbox form-field w-0"
          id={props.fieldName}
          name={props.fieldName}
          checked={props.value}
          onChange={onChange}
          disabled={props.disabled}
        />
        <div class={`toggle-switch ${props.disabled ? 'toggle-disabled' : ''}`}></div>
      </label>
      <Show when={props.label && props.reverse}>
        <FormLabel label={props.label} helperText={props.helperText} />
      </Show>
    </div>
  )
}

export const ToggleButtons: Component<{
  items: Option[]
  onChange: (opt: Option) => void
  selected: string
}> = (props) => {
  const selected = createMemo(() => {
    const idx = props.items.findIndex((opt) => opt.value === props.selected)
    return idx === -1 ? 0 : idx
  })

  return (
    <div class="flex">
      <For each={props.items}>
        {(opt, i) => {
          const isLast = props.items.length === i() + 1
          return (
            <button
              type="button"
              value={props.selected}
              class="flex items-center justify-center rounded-none border-[1px] border-[var(--hl-800)] py-2"
              classList={{
                'btn-primary': selected() === i(),
                'btn-hollow': selected() !== i(),
                'rounded-l-md': i() === 0,
                'rounded-r-md': isLast,
              }}
              onClick={() => props.onChange(opt)}
            >
              {opt.label}
            </button>
          )
        }}
      </For>
    </div>
  )
}
