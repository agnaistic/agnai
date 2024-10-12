import './variables.css'
import './tailwind.css'
import './app.css'
import './dots.css'
import '@melloware/coloris/dist/coloris.css'
import './store'
import { Component, createMemo, Show, lazy, onMount, Switch, Match } from 'solid-js'
import { Route, Router, useLocation } from '@solidjs/router'
import NavBar from './shared/NavBar'
import Notifications from './Toasts'
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
import Settings, { SettingsModal } from './pages/Settings'
import ProfilePage, { ProfileModal } from './pages/Profile'
import { useCharacterBg, usePaneManager } from './shared/hooks'
import { rootModalStore } from './store/root-modal'
import { For } from 'solid-js'
import { css, getMaxChatWidth } from './shared/util'
import FAQ from './pages/Home/FAQ'
import CreateChatForm from './pages/Chat/CreateChatForm'
import Modal from './shared/Modal'
import { ContextProvider } from './store/context'
import MemoryGuide from './pages/Guides/Memory'
import NovelGuide from './pages/Guides/NovelAI'
import { ImageModal } from './pages/Chat/ImageModal'
import { CheckoutCancel, CheckoutSuccess } from './pages/Profile/Checkout'
import { markdown } from './shared/markdown'
import SoundsPage from './pages/Sounds'
import PatreonOauth from './pages/Settings/PatreonOauth'
import { SagaDetail } from './pages/Saga/Detail'
import { SagaList } from './pages/Saga/List'
import { ImageSettingsModal } from './pages/Settings/Image/ImageSettings'

const App: Component = () => {
  const state = userStore()
  const cfg = settingStore()

  return (
    <Router root={Layout}>
      <CharacterRoutes />
      <ScenarioRoutes />
      <Route path="/discord" component={() => <Redirect external="https://discord.agnai.chat" />} />
      <ChubRoutes />
      <Route path="/chats/create/:id?" component={() => <CreateChatForm />} />
      <Route path="/chats" component={CharacterChats} />
      <Route path="/chat" component={ChatDetail} />
      <Show when={cfg.config.guidanceAccess || state.user?.admin}>
        <Route path="/saga" component={SagaList} />
        <Route path="/saga/:id" component={SagaDetail} />
      </Show>
      <Route path="/chat/:id" component={ChatDetail} />
      <Route path={['/info', '/']} component={HomePage} />
      <Route path="/presets/:id" component={lazy(() => import('./pages/GenerationPresets'))} />
      <Route
        path="/presets"
        component={lazy(() => import('./pages/GenerationPresets/PresetList'))}
      />
      <Show when={cfg.flags.sounds}>
        <Route path="/sounds" component={SoundsPage} />
      </Show>
      <Route path="/oauth/patreon" component={PatreonOauth} />
      <Route path="/profile" component={() => <ProfilePage />} />
      <Route path="/settings" component={() => <Settings />} />
      <Route path="/memory" component={lazy(() => import('./pages/Memory/Library'))} />
      <Route path="/memory/:id" component={lazy(() => import('./pages/Memory/EditMemoryPage'))} />
      <Route path="/terms-of-service" component={lazy(() => import('./pages/TermsOfService'))} />
      <Route path="/checkout">
        <Route path="/success" component={CheckoutSuccess} />
        <Route path="/cancel" component={CheckoutCancel} />
      </Route>
      <Route path="/privacy-policy" component={lazy(() => import('./pages/PrivacyPolicy'))} />
      <Route path="/guides">
        <Route path="/memory" component={MemoryGuide} />
        <Route path="/novel" component={NovelGuide} />
      </Route>
      <Show when={state.loggedIn}>
        <Route path="/invites" component={lazy(() => import('./pages/Invite/InvitesPage'))} />
        <Show when={state.user?.admin}>
          <Route path="/admin/metrics" component={lazy(() => import('./pages/Admin/Metrics'))} />

          <Route
            path="/admin/configuration"
            component={lazy(() => import('./pages/Admin/Configuration'))}
          />

          <Route path="/admin/users" component={lazy(() => import('./pages/Admin/UsersPage'))} />
          <Route
            path="/admin/subscriptions"
            component={lazy(() => import('./pages/Admin/SubscriptionList'))}
          />
          <Route
            path="/admin/subscriptions/:id"
            component={lazy(() => import('./pages/Admin/SubscriptionModel'))}
          />
          <Route
            path={['/admin/announcements', '/admin/announcements/:id']}
            component={lazy(() => import('./pages/Admin/Announcements'))}
          />
          <Route path="/admin/tiers/:id" component={lazy(() => import('./pages/Admin/Tiers'))} />
        </Show>
      </Show>
      <Show when={cfg.config.canAuth}>
        <Route path={['/login', '/login/remember']} component={LoginPage} />
      </Show>
      <Route path="/faq" component={FAQ} />
      <Route path="*" component={HomePage} />
    </Router>
  )
}

const Layout: Component<{ children?: any }> = (props) => {
  const state = userStore()
  const cfg = settingStore()

  const location = useLocation()
  const pane = usePaneManager()

  const maxW = createMemo((): string => {
    if (pane.showing()) return 'max-w-full'

    return getMaxChatWidth(state.ui.chatWidth)
  })
  const rootModals = rootModalStore()

  const reload = () => {
    settingStore.init()
  }

  onMount(() => {
    settingStore.init()
  })

  const isChat = createMemo(() => {
    return location.pathname.startsWith('/chat/') || location.pathname.startsWith('/saga/')
  })

  const bgStyles = useCharacterBg('layout')

  return (
    <ContextProvider>
      <style>{css}</style>
      <div class="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-[var(--hl-900)] app flex flex-col justify-between">
        <NavBar />
        <div class="flex w-full grow flex-row overflow-y-hidden">
          <Navigation />

          <main
            id="main-content"
            class="w-full overflow-y-auto overflow-x-hidden"
            classList={{
              'sm:ml-[320px]': cfg.showMenu,
              'sm:ml-0': !cfg.showMenu,
            }}
            data-background
            style={{ ...bgStyles(), 'scrollbar-gutter': 'stable' }}
          >
            <div
              class={`mx-auto h-full min-h-full ${isChat() ? maxW() : 'max-w-8xl'}`}
              classList={{
                'content-background': !isChat(),
              }}
            >
              <Switch>
                <Match when={cfg.init}>
                  {props.children}
                  <Maintenance />
                </Match>

                <Match when={cfg.initLoading}>
                  <div class="flex h-[80vh] flex-col items-center justify-center gap-2">
                    <div>
                      Login issues? Try{' '}
                      <a class="link" onClick={() => userStore.logout()}>
                        Logging out
                      </a>{' '}
                      then log back in.
                    </div>
                    <Loading />
                  </div>
                </Match>
                <Match when>
                  <div class="flex flex-col items-center gap-2">
                    <div>Agnaistic failed to load</div>
                    <div>
                      <Button onClick={reload}>Try Again</Button>
                    </div>
                  </div>
                </Match>
              </Switch>
            </div>
          </main>
        </div>
      </div>
      <Notifications />
      <ImpersonateModal
        show={cfg.showImpersonate}
        close={() => settingStore.toggleImpersonate(false)}
      />
      <InfoModal />
      <ProfileModal />
      <For each={rootModals.modals}>{(modal) => modal.element}</For>
      <ImageModal />
      <Show when={cfg.showImgSettings}>
        <ImageSettingsModal />
      </Show>
      <SettingsModal />
      <div
        class="absolute bottom-0 left-0 right-0 top-0 z-10 h-[100vh] w-full bg-black bg-opacity-20 sm:hidden"
        classList={{ hidden: !cfg.showMenu }}
        onClick={() => settingStore.closeMenu()}
      ></div>
    </ContextProvider>
  )
}

const InfoModal: Component = (props) => {
  const state = rootModalStore()

  return (
    <Modal
      title={state.infoTitle || 'Information'}
      show={state.info}
      close={() => rootModalStore.closeInfo()}
      maxWidth="half"
    >
      <Show when={typeof state.info === 'string'} fallback={state.info}>
        <div class="markdown" innerHTML={markdown.makeHtml(state.info)} />
      </Show>
    </Modal>
  )
}

export default App
