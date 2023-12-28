import {
  Component,
  JSX,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
} from 'solid-js'
import Divider from './Divider'
import Slot from './Slot'

type Props = {
  title: string | JSX.Element
  subtitle?: string | JSX.Element
  noDivider?: boolean
  noslot?: boolean
  sticky?: boolean

  /** Indicates if the header is being used in a modal or pane */
  subPage?: boolean
}

const PageHeader: Component<Props> = (props) => {
  let ref: HTMLDivElement
  const [_sticky, setSticky] = createSignal(true)

  createEffect(() => {
    setTimeout(() => setSticky(false), 4000)
  })

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
        <p class="text-[var(--text-700)]" role="heading" aria-level={2}>
          {props.subtitle}
        </p>
      </Show>
      <Show when={!props.noDivider && (!!props.title || !!props.subtitle)}>
        <Divider />
      </Show>

      <Show when={!props.noslot}>
        <div ref={ref!} class="mb-2 flex w-full justify-center">
          <Switch>
            <Match when={ref!}>
              <Slot
                sticky
                slot={props.subPage ? 'pane_leaderboard' : 'leaderboard'}
                parent={ref!}
              />
            </Match>
          </Switch>
        </div>
      </Show>
    </>
  )
}

export default PageHeader
