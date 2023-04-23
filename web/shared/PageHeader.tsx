import { Component, JSX, Show, createMemo } from 'solid-js'
import Divider from './Divider'

type Props = {
  title: string | JSX.Element
  subtitle?: string | JSX.Element
  noDivider?: boolean
  sticky?: boolean
}

const PageHeader: Component<Props> = (props) => {
  const mod = createMemo(() => (props.sticky ? `sticky top-0 py-2` : ''))
  return (
    <>
      <div class={`${mod()} bg-[var(--bg-900)]`}>
        <h1 class={'text-900 justify-center text-4xl sm:flex sm:w-full sm:justify-start'}>
          {props.title}
        </h1>
      </div>
      <Show when={!!props.subtitle}>
        <p class="text-[var(--text-700)]">{props.subtitle}</p>
      </Show>
      <Show when={!props.noDivider}>
        <Divider />
      </Show>
    </>
  )
}

export default PageHeader
