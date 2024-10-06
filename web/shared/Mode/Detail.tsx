import './mode.scss'
import { Component, JSX, Match, Show, Switch, createMemo } from 'solid-js'
import Loading from '../Loading'
import { settingStore, userStore } from '/web/store'
import { useCharacterBg, usePane, useRef, useResizeObserver, useWindowSize } from '../hooks'
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
  const size = useWindowSize()

  // createEffect(() => {
  //   chatStore.option('pane', props.showPane ? 'other' : undefined)
  // })

  const viewHeight = createMemo(() => {
    const percent = props.splitHeight ?? 40
    return `calc(${percent}vh)`
  })

  const width = createMemo(() => {
    if (props.showPane) return 'full'
    return user.ui.chatWidth || 'fill'
  })

  const slots = useResizeObserver()

  const [slot, onSlot] = useRef()
  const bgStyles = useCharacterBg('page')

  return (
    <>
      <Show when={props.loading}>
        <div class="mt-24 flex w-full justify-center">
          <Loading />
        </div>
      </Show>

      <Show when={!props.loading}>
        <section
          class="mode pl-2 pr-2 sm:pl-2"
          style={bgStyles()}
          classList={{
            'sm:pr-0': props.showPane,
            'sm:pr-3': !props.showPane,
          }}
        >
          <Show when={!!props.header || !cfg.config.tier?.disableSlots}>
            <header class="flex w-full flex-col gap-2 pt-2" style={{ 'grid-area': 'header' }}>
              {props.header}

              <div
                ref={(ref) => {
                  onSlot(ref)
                  slots.load(ref)
                }}
                class="h-min-[100px] sticky top-0 -mt-[8px] flex w-[calc(100vw-16px)] max-w-[calc(100vw-16px)] justify-center overflow-x-hidden sm:w-full sm:max-w-none"
                classList={{
                  hidden: user.sub?.tier.disableSlots,
                }}
              >
                <Switch>
                  <Match when={slot()}>
                    <Slot sticky="always" slot="leaderboard" parent={slot()} />
                  </Match>
                </Switch>
              </div>
            </header>
          </Show>

          <section
            style={{ 'grid-area': 'content' }}
            class="content mb-2 flex w-full flex-row gap-1 overflow-y-auto"
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
                class="mode-content flex w-full flex-col-reverse overflow-y-auto"
                classList={{
                  // Chat Width
                  'w-full max-w-full': props.showPane || user.ui.chatWidth === 'full',
                  'w-full max-w-3xl': !props.showPane && user.ui.chatWidth === 'narrow',
                  // Chat Margin
                  'xs:mr-auto mx-auto': props.showPane,
                  // 'mx-auto': !props.showPane,
                }}
              >
                {props.children}
              </section>
            </section>
          </section>

          <footer
            style={{ 'grid-area': 'footer' }}
            classList={{
              'w-full': width() === 'full',
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
            class="pane ml-2 w-[480px] 2xl:w-[600px] "
            style={{ 'grid-area': 'pane' }}
            classList={{
              hidden: !size.pane() || !props.showPane,
            }}
          >
            {props.pane}
          </section>
        </section>
      </Show>
    </>
  )
}
