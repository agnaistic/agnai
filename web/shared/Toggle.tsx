import { Component, JSX, Show, createMemo } from 'solid-js'
import { FormLabel } from './FormLabel'
import './toggle.css'
import { AIAdapter } from '../../common/adapters'

export const Toggle: Component<{
  fieldName: string
  value?: boolean
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  class?: string
  onChange?: (value: boolean) => void
  disabled?: boolean

  service?: AIAdapter
  adapters?: AIAdapter[] | readonly AIAdapter[]
}> = (props) => {
  const onChange = (ev: Event & { currentTarget: HTMLInputElement }) => {
    if (props.disabled) return
    props.onChange?.(ev.currentTarget.checked)
  }

  const hide = createMemo(() => {
    if (!props.service || !props.adapters) return ''
    return props.adapters.includes(props.service) ? '' : ` hidden `
  })

  return (
    <div class={hide()}>
      <Show when={props.label}>
        <FormLabel label={props.label} helperText={props.helperText} />
      </Show>
      <label class={`toggle ${props.disabled ? 'toggle-disabled' : ''}`}>
        <input
          type="checkbox"
          class="toggle-checkbox w-0"
          id={props.fieldName}
          name={props.fieldName}
          checked={props.value}
          onChange={onChange}
          disabled={props.disabled}
        />
        <div class={`toggle-switch ${props.disabled ? 'toggle-disabled' : ''}`}></div>
      </label>
    </div>
  )
}
