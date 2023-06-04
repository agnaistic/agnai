import { Component, createEffect, createMemo, JSX, Show, lazy, createSignal } from 'solid-js'
import { Outlet, Route, Router, Routes, useLocation, useNavigate } from '@solidjs/router'
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
import './app.css'
import './dots.css'
import Modal from './shared/Modal'
import ImpersonateModal from './pages/Character/ImpersonateModal'
import ChubRoutes from './pages/Chub'

const App: Component = () => {
  const state = userStore()
  const cfg = settingStore()

  return (
    <Router>
      <Routes>
        <Route path="" component={Layout}>
          <CharacterRoutes />
          <Route
            path="/discord"
            component={() => <Redirect external="https://discord.gg/luminai" />}
          />
          <ChubRoutes />
          <Route path="/chats" component={lazy(() => import('./pages/Character/ChatList'))} />
          <Route path="/chat" component={lazy(() => import('./pages/Chat/ChatDetail'))} />
          <Route path="/chat/:id" component={lazy(() => import('./pages/Chat/ChatDetail'))} />
          <Route path={['/info', '/']} component={HomePage} />
          <Route path="/changelog" component={lazy(() => import('./pages/Home/ChangeLog'))} />
          <Route path="/presets/:id" component={lazy(() => import('./pages/GenerationPresets'))} />
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
          <Route
            path="/terms-of-service"
            component={lazy(() => import('./pages/TermsOfService'))}
          />
          <Route path="/privacy-policy" component={lazy(() => import('./pages/PrivacyPolicy'))} />
          <Show when={state.loggedIn}>
            <Route path="/invites" component={lazy(() => import('./pages/Invite/InvitesPage'))} />
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
        </Route>
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
      <NavBar />
      <div class="flex w-full grow flex-row overflow-y-hidden">
        <Navigation />
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
      <ImpersonateModal
        show={cfg.showImpersonate}
        close={() => settingStore.toggleImpersonate(false)}
      />
    </div>
  )
}

export default App

const Maintenance: Component = () => {
  const state = settingStore((s) => ({ init: s.init, loading: s.initLoading }))
  const [show, setShow] = createSignal(!!state.init?.config.maintenance)

  return (
    <Modal show={show()} close={() => setShow(false)} title="Maintenance Mode">
      <div class="flex flex-col gap-4">
        <div>Agnaistic is currently down for maintenance</div>

        <div>You can continue to use the site as a guest.</div>

        <div>Reason: {state.init?.config.maintenance}</div>
      </div>
    </Modal>
  )
}

const Redirect: Component<{ internal?: string; external?: string }> = (props) => {
  const nav = useNavigate()

  if (props.external) {
    window.location.href = props.external
  }

  nav(props.internal || '/')

  return <>Redirecting...</>
}
