import { Component, JSX, Show } from 'solid-js'
import { getSettingColor } from '../store'

const ColorPicker: Component<{
  fieldName: string
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  value?: string
  onChange?: (value: string) => void
}> = (props) => {
  let ref: any

  const onChange = (ev: Event & { currentTarget: HTMLInputElement }) => {
    props.onChange?.(ev.currentTarget.value)
  }

  return (
    <div class="">
      <Show when={!!props.label || !!props.helperText}>
        <label for={props.fieldName}>
          <Show when={!!props.label}>
            <div class={props.helperText ? '' : 'pb-1'}>{props.label}</div>
          </Show>
          <Show when={!!props.helperText}>
            <p class="mt-[-0.125rem] pb-2 text-sm text-[var(--text-700)]">{props.helperText}</p>
          </Show>
        </label>
      </Show>
      <input
        ref={ref}
        type="color"
        value={getSettingColor(props.value || '')}
        onChange={onChange}
      />
    </div>
  )
}

export default ColorPicker
