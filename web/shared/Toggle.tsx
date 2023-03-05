import { Component, JSX, Show } from 'solid-js'
import { FormLabel } from './FormLabel'

export const Toggle: Component<{
  fieldName: string
  value?: boolean
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  onChange?: (value: boolean) => void
}> = (props) => {
  const onChange = (ev: Event & { currentTarget: HTMLInputElement }) => {
    props.onChange?.(ev.currentTarget.checked)
  }

  return (
    <div class="toggle-pill-color">
      <Show when={props.label}>
        <FormLabel label={props.label} helperText={props.helperText} />
      </Show>

      <input
        type="checkbox"
        id={props.fieldName}
        name={props.fieldName}
        checked={props.value}
        onChange={onChange}
      />
      <label for={props.fieldName}></label>
    </div>
  )
}
