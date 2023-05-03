import { Component, createEffect, createMemo, JSX, Show, lazy } from 'solid-js'
import { Route, Routes } from '@solidjs/router'
import NavBar from './shared/NavBar'
import Toasts from './Toasts'
import CharacterRoutes from './pages/Character'
import { settingStore } from './store/settings'
import { userStore } from './store/user'
import LoginPage from './pages/Login'
import HomePage from './pages/Home'
import Navigation from './Navigation'
import Loading from './shared/Loading'
import Button from './shared/Button'
import './dots.css'

const App: Component = () => {
  const state = userStore()
  const cfg = settingStore()

  const reload = () => {
    settingStore.init()
  }

  createEffect(() => {
    settingStore.init()
  })

  const bg = createMemo(() => {
    const styles: JSX.CSSProperties = {
      'background-image':
        state.background && !cfg.anonymize ? `url(${state.background})` : undefined,
      'background-repeat': 'no-repeat',
      'background-size': 'cover',
      'background-position': 'center',
    }
    return styles
  })

  return (
    <div class="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-[var(--hl-900)] app flex flex-col justify-between">
      <NavBar />
      <div class="flex w-full grow flex-row overflow-y-hidden">
        <Navigation />
        <div class="w-full overflow-y-auto" data-background style={bg()}>
          <div class={`mx-auto h-full w-full max-w-5xl px-2 pt-2 sm:px-3 sm:pt-4`}>
            <Show when={cfg.init}>
              <Routes>
                <CharacterRoutes />
                <Route path="/chats" component={lazy(() => import('./pages/Character/ChatList'))} />
                <Route path="/chat" component={lazy(() => import('./pages/Chat/ChatDetail'))} />
                <Route path="/chat/:id" component={lazy(() => import('./pages/Chat/ChatDetail'))} />
                <Route path="/" component={lazy(() => import('./pages/Character/CharacterList'))} />
                <Route path="/info" component={HomePage} />
                <Route path="/changelog" component={lazy(() => import('./pages/Home/ChangeLog'))} />
                <Route
                  path="/presets/:id"
                  component={lazy(() => import('./pages/GenerationPresets'))}
                />
                <Route
                  path="/presets"
                  component={lazy(() => import('./pages/GenerationPresets/PresetList'))}
                />
                <Route path="/profile" component={lazy(() => import('./pages/Profile'))} />
                <Route path="/settings" component={lazy(() => import('./pages/Settings'))} />
                <Route path="/memory" component={lazy(() => import('./pages/Memory'))} />
                <Route
                  path="/memory/:id"
                  component={lazy(() => import('./pages/Memory/EditMemoryPage'))}
                />
                <Show when={state.loggedIn}>
                  <Route
                    path="/invites"
                    component={lazy(() => import('./pages/Invite/InvitesPage'))}
                  />
                  <Show when={state.user?.admin}>
                    <Route
                      path="/admin/metrics"
                      component={lazy(() => import('./pages/Admin/Metrics'))}
                    />
                    <Route
                      path="/admin/users"
                      component={lazy(() => import('./pages/Admin/UsersPage'))}
                    />
                  </Show>
                </Show>
                <Show when={cfg.config.canAuth}>
                  <Route path="/login" component={LoginPage} />
                </Show>
                <Route path="*" component={HomePage} />
              </Routes>
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
