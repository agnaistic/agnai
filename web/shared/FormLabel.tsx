import { Component, JSX, Show } from 'solid-js'

export const FormLabel: Component<{
  fieldName?: string
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  class?: string
}> = (props) => (
  <Show when={props.label !== undefined}>
    <label for={props.fieldName || ''}>
      <div class={props.helperText ? '' : 'pb-1' + ' ' + (props.class || '')}>{props.label}</div>
      <Show when={!!props.helperText}>
        <p class="helper-text mt-[-0.125rem] pb-1 text-sm text-[var(--text-500)]">
          {props.helperText}
        </p>
      </Show>
    </label>
  </Show>
)
