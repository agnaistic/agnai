import { Component, JSX, Show } from 'solid-js'

export const FormLabel: Component<{
  fieldName?: string
  label?: string
  helperText?: string | JSX.Element
}> = (props) => (
  <Show when={!!props.label}>
    <label for={props.fieldName || ''}>
      <div class={props.helperText ? '' : 'pb-1'}>{props.label}</div>
      <Show when={!!props.helperText}>
        <p class="mt-[-0.125rem] pb-1 text-sm text-white/50">{props.helperText}</p>
      </Show>
    </label>
  </Show>
)
