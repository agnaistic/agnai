import { Component, JSX, Match, Show, Switch, createEffect, createMemo } from 'solid-js'
import Loading from '../Loading'
import { chatStore, settingStore, userStore } from '/web/store'
import { getHeaderBg } from '/web/pages/Chat/helpers'
import { usePane, useResizeObserver } from '../hooks'
import Slot from '../Slot'

export const ModeDetail: Component<{
  loading: boolean
  children?: JSX.Element
  pane?: JSX.Element
  header?: JSX.Element
  split?: JSX.Element

  /** Percentage of content pane height */
  splitHeight?: number
}> = (props) => {
  const cfg = settingStore()
  const user = userStore()
  const mode = usePane()

  createEffect(() => {
    chatStore.option('pane', props.pane ? 'other' : undefined)
  })

  const viewHeight = createMemo(() => {
    const percent = props.splitHeight ?? 40
    return `calc(${percent}vh - 24px)`
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
        <main class="mx-auto flex w-full justify-between gap-4">
          <div
            class="chat-detail flex flex-col gap-1 pb-1 xs:flex sm:gap-2 sm:py-2"
            classList={{
              // Chat Width
              'w-full max-w-full': !!props.pane || user.ui.chatWidth === 'full',
              'w-full max-w-3xl': !props.pane && user.ui.chatWidth === 'narrow',
              // Chat Margin
              'xs:mr-auto mx-auto': !!props.pane,
              'mx-auto': !props.pane,
            }}
          >
            <header
              class="hidden h-9 items-center justify-between rounded-md sm:flex"
              classList={{ 'sm:flex': !!props.header }}
              style={header()}
            >
              {props.header}
            </header>

            <section
              class="flex w-full flex-row justify-end gap-1 overflow-y-auto"
              classList={{
                'justify-center': !props.pane || mode() === 'popup',
                'justify-end gap-1 justify-self-center flex-row flex':
                  !!props.pane && mode() === 'pane',
              }}
            >
              <section class="flex h-full w-full flex-col justify-end gap-2 sm:pr-2">
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

                <Show when={!!props.split}>
                  <section
                    data-avatar-container
                    class="flex items-end justify-center"
                    style={{ height: `${viewHeight()}`, 'min-height': viewHeight() }}
                  >
                    {props.split}
                  </section>
                </Show>

                <section
                  data-messages
                  class="mx-auto flex w-full flex-col-reverse gap-4 overflow-y-auto"
                  classList={{
                    'max-w-6xl': width() === 'xl',
                    'max-w-7xl': width() === '2xl',
                    'max-w-8xl': width() === '3xl',
                    'max-w-none': width() === 'fill',
                    'max-w-5xl': width() === 'fill' || width() === 'narrow' || !width(),
                  }}
                >
                  {props.children}
                </section>
              </section>
              {props.pane}
            </section>
          </div>
        </main>
      </Show>
    </>
  )
}
