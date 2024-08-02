import { Component, JSX, Show } from 'solid-js'
import { markdown } from './markdown'

export const FormLabel: Component<{
  fieldName?: string
  label?: string | JSX.Element
  helperText?: string | JSX.Element
  helperMarkdown?: string
  class?: string
}> = (props) => (
  <Show
    when={
      props.label !== undefined ||
      props.helperText !== undefined ||
      props.helperMarkdown !== undefined
    }
  >
    <label for={props.fieldName || ''}>
      <div class={props.helperText || props.helperMarkdown ? '' : '' + ' ' + (props.class || '')}>
        {props.label}
      </div>
      <Show when={!!props.helperText}>
        <p class="helper-text">{props.helperText}</p>
      </Show>
      <Show when={!!props.helperMarkdown}>
        <p class="helper-text markdown" innerHTML={markdown.makeHtml(props.helperMarkdown!)}></p>
      </Show>
    </label>
  </Show>
)
