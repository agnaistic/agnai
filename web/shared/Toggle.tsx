import { Component, JSX, Show } from 'solid-js'
import { FormLabel } from './FormLabel'
import './toggle.css'

export const Toggle: Component<{
  fieldName: string
  value?: boolean
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  class?: string
  onChange?: (value: boolean) => void
}> = (props) => {
  const onChange = (ev: Event & { currentTarget: HTMLInputElement }) => {
    props.onChange?.(ev.currentTarget.checked)
  }

  return (
    <div>
      <Show when={props.label}>
        <FormLabel label={props.label} helperText={props.helperText} />
      </Show>
      <label class="toggle">
        <input
          type="checkbox"
          class="toggle-checkbox"
          id={props.fieldName}
          name={props.fieldName}
          checked={props.value}
          onChange={onChange}
        />
        <div class="toggle-switch"></div>
      </label>
    </div>
  )
}
