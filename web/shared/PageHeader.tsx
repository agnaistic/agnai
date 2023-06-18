import { Component, JSX, Show, createMemo } from 'solid-js'
import Divider from './Divider'
import { useWindowSize } from './hooks'
import Slot from './Slot'

type Props = {
  title: string | JSX.Element
  subtitle?: string | JSX.Element
  noDivider?: boolean
  sticky?: boolean
}

const PageHeader: Component<Props> = (props) => {
  const page = useWindowSize()
  const mod = createMemo(() => (props.sticky ? `sticky top-0 py-2` : ''))
  return (
    <>
      <Show when={props.title}>
        <div class={`${mod()}`}>
          <h1 class={'text-900 justify-center text-4xl sm:flex sm:w-full sm:justify-start'}>
            {props.title}
          </h1>
        </div>
      </Show>

      <Show when={!!props.subtitle}>
        <p class="text-[var(--text-700)]">{props.subtitle}</p>
      </Show>
      <Show when={!props.noDivider && (!!props.title || !!props.subtitle)}>
        <Divider />
      </Show>

      <div class="flex justify-center">
        <Show when={page.width() >= 768}>
          <Slot slot="banner" />
        </Show>
        <Show when={page.width() < 768}>
          <Slot slot="mobile" />
        </Show>
      </div>
    </>
  )
}

export default PageHeader
