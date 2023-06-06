import { Component, createEffect, createMemo, JSX, Show } from 'solid-js'
import { Outlet, Route, Router, Routes, useLocation } from '@solidjs/router'
import './app.css'
import './dots.css'
import { settingStore, userStore } from '/web/store'
import Toasts from '/web/Toasts'
import Button from '/web/shared/Button'
import Loading from '/web/shared/Loading'
import Maintenance from '/web/shared/Maintenance'

const App: Component = () => {
  // const state = userStore()
  // const cfg = settingStore()

  return (
    <Router>
      <Routes>
        <Route path="" component={Layout}></Route>
      </Routes>
    </Router>
  )
}

const Layout: Component = () => {
  const state = userStore()
  const cfg = settingStore()
  const location = useLocation()

  const reload = () => {
    settingStore.init()
  }

  createEffect(() => {
    settingStore.init()
    settingStore.getConfig()
  })

  const isChat = createMemo(() => {
    return location.pathname.startsWith('/chat/')
  })

  const bg = createMemo(() => {
    const styles: JSX.CSSProperties = {
      'background-image':
        state.background && !cfg.anonymize ? `url(${state.background})` : undefined,
      'background-repeat': 'no-repeat',
      'background-size': 'cover',
      'background-position': 'center',
      'background-color': isChat() ? undefined : '',
    }
    return styles
  })

  return (
    <div class="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-[var(--hl-900)] app flex flex-col justify-between">
      {/* <NavBar /> */}
      <div class="flex w-full grow flex-row overflow-y-hidden">
        {/* <Navigation /> */}
        <div class="w-full overflow-y-auto" data-background style={bg()}>
          <div
            class={`mx-auto h-full min-h-full w-full max-w-5xl px-2 sm:px-3`}
            classList={{ 'content-background': !isChat() }}
          >
            <Show when={cfg.init}>
              <Outlet />
              <Maintenance />
            </Show>
            <Show when={!cfg.init && cfg.initLoading}>
              <div class="flex h-[80vh] items-center justify-center">
                <Loading />
              </div>
            </Show>

            <Show when={!cfg.init && !cfg.initLoading}>
              <div class="flex flex-col items-center gap-2">
                <div>Agnaistic failed to load</div>
                <div>
                  <Button onClick={reload}>Try Again</Button>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </div>
      <Toasts />
    </div>
  )
}

export default App
