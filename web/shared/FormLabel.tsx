import { Component, JSX, Show } from 'solid-js'

export const FormLabel: Component<{
  fieldName?: string
  label?: string | JSX.Element
  helperText?: string | JSX.Element
}> = (props) => (
  <Show when={props.label !== undefined}>
    <label for={props.fieldName || ''}>
      <div class={props.helperText ? '' : 'pb-1'}>{props.label}</div>
      <Show when={!!props.helperText}>
        <p class="mt-[-0.125rem] pb-1 text-sm text-[var(--text-700)]">{props.helperText}</p>
      </Show>
    </label>
  </Show>
)
