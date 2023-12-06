import { Component, JSX, Match, Show, Switch, createMemo } from 'solid-js'
import Loading from '../Loading'
import { settingStore, userStore } from '/web/store'
import { getHeaderBg } from '/web/pages/Chat/helpers'
import { usePane, useResizeObserver } from '../hooks'
import Slot from '../Slot'

export const ModeDetail: Component<{
  loading: boolean
  children?: JSX.Element
  pane?: JSX.Element
  header?: JSX.Element
}> = (props) => {
  const cfg = settingStore()
  const user = userStore()

  const pane = usePane()
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
            class="chat-detail mx-auto flex flex-col gap-1 pb-1 xs:flex sm:gap-2 sm:py-2"
            classList={{
              'w-full max-w-3xl': user.ui.chatWidth === 'narrow',
              'w-full max-w-full': user.ui.chatWidth === 'full',
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
                'justify-center': !!props.pane && pane() === 'popup',
                'justify-end gap-1 justify-self-center flex-row flex':
                  !!props.pane && pane() === 'pane',
              }}
            >
              <section class="flex h-full w-full flex-col justify-end gap-2">
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
                {props.children}
              </section>
              {props.pane}
            </section>
          </div>
        </main>
      </Show>
    </>
  )
}
