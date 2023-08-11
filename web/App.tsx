import './variables.css'
import './tailwind.css'
import './app.css'
import './dots.css'
import '@melloware/coloris/dist/coloris.css'
import { Component, createEffect, createMemo, JSX, Show, lazy } from 'solid-js'
import { Outlet, Route, Router, Routes, useLocation } from '@solidjs/router'
import NavBar from './shared/NavBar'
import Toasts from './Toasts'
import CharacterRoutes from './pages/Character'
import ScenarioRoutes from './pages/Scenario'
import { settingStore } from './store/settings'
import { userStore } from './store/user'
import LoginPage from './pages/Login'
import HomePage from './pages/Home'
import Navigation from './Navigation'
import Loading from './shared/Loading'
import Button from './shared/Button'
import ImpersonateModal from './pages/Character/ImpersonateModal'
import ChubRoutes from './pages/Chub'
import Redirect from './shared/Redirect'
import Maintenance from './shared/Maintenance'
import CharacterChats from './pages/Character/ChatList'
import ChatDetail from './pages/Chat/ChatDetail'
import ChangeLog from './pages/Home/ChangeLog'
import Settings from './pages/Settings'
import ProfilePage, { ProfileModal } from './pages/Profile'
import { chatStore } from './store'
import { usePane } from './shared/hooks'
import { rootModalStore } from './store/root-modal'
import { For } from 'solid-js'
import { getMaxChatWidth } from './shared/util'
import FAQ from './pages/Home/FAQ'
import CreateChatForm from './pages/Chat/CreateChatForm'
import Modal from './shared/Modal'
import { ContextProvider } from './store/context'
import PipelineGuide from './pages/Guides/Pipeline'
import MemoryGuide from './pages/Guides/Memory'
import NovelGuide from './pages/Guides/NovelAI'
import { ImageModal } from './pages/Chat/ImageModal'

const App: Component = () => {
  const state = userStore()
  const cfg = settingStore()

  return (
    <Router>
      <Routes>
        <Route path="" component={Layout}>
          <CharacterRoutes />
          <ScenarioRoutes />
          <Route
            path="/discord"
            component={() => <Redirect external="https://agnai.chat/discord" />}
          />
          <ChubRoutes />
          <Route path="/chats/create/:id?" component={CreateChatForm} />
          <Route path="/chats" component={CharacterChats} />
          <Route path="/chat" component={ChatDetail} />
          <Route path="/chat/:id" component={ChatDetail} />
          <Route path={['/info', '/']} component={HomePage} />
          <Route path="/changelog" component={ChangeLog} />
          <Route path="/presets/:id" component={lazy(() => import('./pages/GenerationPresets'))} />
          <Route
            path="/presets"
            component={lazy(() => import('./pages/GenerationPresets/PresetList'))}
          />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/settings" component={Settings} />
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
          <Route path="/guides">
            <Route path="/pipeline" component={PipelineGuide} />
            <Route path="/memory" component={MemoryGuide} />
            <Route path="/novel" component={NovelGuide} />
          </Route>
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
          <Route path="/faq" component={FAQ} />
          <Route path="/builder" component={lazy(() => import('./shared/Avatar/Builder'))} />
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
  const chat = chatStore()
  const paneOrPopup = usePane()
  const isPaneOpen = createMemo(() => paneOrPopup() === 'pane' && !!chat.opts.pane)

  const maxW = createMemo((): string => {
    if (isPaneOpen()) return 'max-w-full'

    return getMaxChatWidth(state.ui.chatWidth)
  })
  const rootModals = rootModalStore()

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
    <ContextProvider>
      <div class="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-[var(--hl-900)] app flex flex-col justify-between">
        <NavBar />
        <div class="flex w-full grow flex-row overflow-y-hidden">
          <Navigation />
          <div class="w-full overflow-y-auto" data-background style={bg()}>
            <div
              class={`mx-auto h-full min-h-full w-full ${maxW()} px-2 sm:px-3`}
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
        <InfoModal />
        <ProfileModal />
        <ImageModal />
        <For each={rootModals.modals}>{(modal) => modal.element}</For>
      </div>

      <div
        class="absolute bottom-0 left-0 right-0 top-0 z-10 h-[100vh] w-full bg-black bg-opacity-5"
        classList={{ hidden: !cfg.overlay }}
        onClick={() => settingStore.toggleOverlay(false)}
      ></div>
    </ContextProvider>
  )
}

const InfoModal: Component = (props) => {
  const state = rootModalStore()

  return (
    <Modal
      title="Information"
      show={state.info}
      close={() => rootModalStore.info()}
      maxWidth="half"
    >
      {state.info}
    </Modal>
  )
}

export default App
