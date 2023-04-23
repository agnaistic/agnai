import { Component, createEffect, Show } from 'solid-js'
import { Route, Routes } from '@solidjs/router'
import CharacterRoutes from './pages/Character'
import Settings from './pages/Settings'
import ChatDetail from './pages/Chat/ChatDetail'
import LoginPage from './pages/Login'
import ProfilePage from './pages/Profile'
import UsersPage from './pages/Admin/UsersPage'
import { InvitesPage } from './pages/Invite/InvitesPage'
import TermsOfServicePage from './pages/TermsOfService'
import PrivacyPolicyPage from './pages/PrivacyPolicy'
import HomePage from './pages/Home'
import GenerationPresetsPage from './pages/GenerationPresets'
import CharacterChats from './pages/Character/ChatList'
import PresetList from './pages/GenerationPresets/PresetList'
import MemoryPage from './pages/Memory'
import { EditMemoryPage } from './pages/Memory/EditMemory'
import MetricsPage from './pages/Admin/Metrics'
import './dots.css'
import Loading from './shared/Loading'
import Button from './shared/Button'
import MainLayout from './layouts/MainLayout'
import { settingStore, userStore } from './store'
import ChangeLog from './pages/Home/ChangeLog'
import CharacterList from './pages/Character/CharacterList'

const App: Component = () => {
  const state = userStore()
  const cfg = settingStore()

  createEffect(() => {
    settingStore.init()
  })

  const reload = () => {
    settingStore.init()
  }

  return (
    <>
      <Show when={cfg.init}>
        <Show when={state.isPastPolicyGate}>Policy Failure</Show>
        <Show when={!state.isPastPolicyGate}>
          <MainLayout>
            <Routes>
              <CharacterRoutes />
              <Route path="/chats" component={CharacterChats} />
              <Route path="/chat" component={() => <ChatDetail />} />
              <Route path="/chat/:id" component={() => <ChatDetail />} />
              <Route path="/" component={CharacterList} />
              <Route path="/info" component={HomePage} />
              <Route path="/changelog" component={ChangeLog} />
              <Route path="/presets/:id" component={GenerationPresetsPage} />
              <Route path="/presets" component={PresetList} />
              <Route path="/profile" component={ProfilePage} />
              <Route path="/settings" component={Settings} />
              <Route path="/memory" component={MemoryPage} />
              <Route path="/memory/:id" component={EditMemoryPage} />
              <Route path="/terms-of-service" component={TermsOfServicePage} />
              <Route path="/privacy-policy" component={PrivacyPolicyPage} />
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
          </MainLayout>
        </Show>
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
    </>
  )
}

export default App
