import { Component, JSX, Show } from 'solid-js'
import Divider from './Divider'

const PageHeader: Component<{ title: string | JSX.Element; subtitle?: string | JSX.Element }> = (
  props
) => (
  <>
    <h1 class="text-900 justify-center text-4xl sm:flex sm:w-full sm:justify-start">
      {props.title}
    </h1>
    <Show when={!!props.subtitle}>
      <p class="text-[var(--text-700)]">{props.subtitle}</p>
    </Show>
    <Divider />
  </>
)

export default PageHeader
