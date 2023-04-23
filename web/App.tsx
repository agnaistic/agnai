import { Component, createEffect, createMemo, JSX, Show, createSignal } from 'solid-js'
import { Route, Routes } from '@solidjs/router'
import NavBar from './shared/NavBar'
import Toasts from './Toasts'
import CharacterRoutes from './pages/Character'
import Settings from './pages/Settings'
import ChatDetail from './pages/Chat/ChatDetail'
import { settingStore, userStore } from './store'
import LoginPage from './pages/Login'
import ProfilePage from './pages/Profile'
import UsersPage from './pages/Admin/UsersPage'
import { InvitesPage } from './pages/Invite/InvitesPage'
import HomePage from './pages/Home'
import Navigation from './Navigation'
import GenerationPresetsPage from './pages/GenerationPresets'
import CharacterChats from './pages/Character/ChatList'
import PresetList from './pages/GenerationPresets/PresetList'
import MemoryPage from './pages/Memory'
import { EditMemoryPage } from './pages/Memory/EditMemory'
import MetricsPage from './pages/Admin/Metrics'
import './dots.css'
import Loading from './shared/Loading'
import Button from './shared/Button'
import ChangeLog from './pages/Home/ChangeLog'
import CharacterList from './pages/Character/CharacterList'

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
                <Route path="/chats" component={CharacterChats} />
                <Route path="/chat" component={ChatDetail} />
                <Route path="/chat/:id" component={ChatDetail} />
                <Route path="/" component={CharacterList} />
                <Route path="/info" component={HomePage} />
                <Route path="/changelog" component={ChangeLog} />
                <Route path="/presets/:id" component={GenerationPresetsPage} />
                <Route path="/presets" component={PresetList} />
                <Route path="/profile" component={ProfilePage} />
                <Route path="/settings" component={Settings} />
                <Route path="/memory" component={MemoryPage} />
                <Route path="/memory/:id" component={EditMemoryPage} />
                <Show when={state.loggedIn}>
                  <Route path="/invites" component={InvitesPage} />
                  <Show when={state.user?.admin}>
                    <Route path="/admin/metrics" component={MetricsPage} />
                    <Route path="/admin/users" component={UsersPage} />
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
