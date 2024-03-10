import './mode.scss'
import { Component, JSX, Match, Show, Switch, createMemo } from 'solid-js'
import Loading from '../Loading'
import { settingStore, userStore } from '/web/store'
import { getHeaderBg } from '/web/pages/Chat/helpers'
import { usePane, useResizeObserver } from '../hooks'
import Slot from '../Slot'

export const ModeDetail: Component<{
  loading: boolean
  children?: JSX.Element
  showPane: boolean
  pane?: JSX.Element
  header?: JSX.Element
  footer?: JSX.Element
  split?: JSX.Element | null | false | undefined

  /** Percentage of content pane height */
  splitHeight?: number
}> = (props) => {
  const cfg = settingStore()
  const user = userStore()
  const mode = usePane()

  // createEffect(() => {
  //   chatStore.option('pane', props.showPane ? 'other' : undefined)
  // })

  const viewHeight = createMemo(() => {
    const percent = props.splitHeight ?? 40
    return `calc(${percent}vh)`
  })

  const width = createMemo(() => user.ui.chatWidth || 'fill')

  const slots = useResizeObserver()

  let slotContainer: HTMLDivElement

  const header = createMemo(() => getHeaderBg(user.ui.mode))

  return (
    <>
      <Show when={props.loading}>
        <div class="mt-24 w-full justify-center">
          <Loading />
        </div>
      </Show>

      <Show when={!props.loading}>
        <section class="mode">
          <header class="flex flex-col gap-2" style={{ 'grid-area': 'header' }}>
            <div
              class="hidden items-center justify-between rounded-md sm:flex"
              classList={{ 'sm:flex': !!props.header }}
              style={header()}
            >
              {props.header}
            </div>
            <div
              ref={(ref) => {
                slotContainer = ref
                slots.load(ref)
              }}
              class="sticky top-0 flex h-fit w-full justify-center"
              classList={{ hidden: cfg.config.tier?.disableSlots }}
            >
              <Switch>
                <Match when={slots.size().w === 0}>{null}</Match>
                <Match when={slotContainer!}>
                  <Slot sticky="always" slot="leaderboard" parent={slotContainer!} />
                </Match>
              </Switch>
            </div>
          </header>

          <section
            style={{ 'grid-area': 'content' }}
            class="content my-2 flex w-full flex-row gap-1 overflow-y-auto"
            classList={{
              'justify-center': !props.showPane || mode() === 'popup',
              'justify-end gap-1 justify-self-center flex-row flex':
                props.showPane && mode() === 'pane',
            }}
          >
            <section class="flex h-full w-full flex-col justify-end gap-2">
              <Show when={!!props.split}>
                <section
                  data-avatar-container
                  class="sticky top-0 flex items-end justify-center"
                  style={{ height: `${viewHeight()}`, 'min-height': viewHeight() }}
                >
                  {props.split}
                </section>
              </Show>
              <section
                data-messages
                class="mx-auto flex w-full flex-col-reverse overflow-y-auto"
                classList={{
                  // Chat Width
                  'w-full max-w-full': props.showPane || user.ui.chatWidth === 'full',
                  'w-full max-w-3xl': !props.showPane && user.ui.chatWidth === 'narrow',
                  // Chat Margin
                  'xs:mr-auto mx-auto': props.showPane,
                  'mx-auto': !props.showPane,
                }}
              >
                {props.children}
              </section>
            </section>
          </section>

          <footer
            style={{ 'grid-area': 'footer' }}
            classList={{
              'max-w-6xl': width() === 'xl',
              'max-w-7xl': width() === '2xl',
              'max-w-8xl': width() === '3xl',
              'max-w-none': width() === 'fill',
              'max-w-5xl': width() === 'fill' || width() === 'narrow' || !width(),
            }}
          >
            {props.footer}
          </footer>
          <section
            class="pane ml-2"
            style={{ 'grid-area': 'pane' }}
            classList={{
              hidden: !props.showPane,
            }}
          >
            {props.pane}
          </section>
        </section>
      </Show>
    </>
  )
}
