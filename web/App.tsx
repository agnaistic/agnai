import { Component, createEffect, Show } from 'solid-js'
import { Route, Routes } from '@solidjs/router'
import NavBar from './shared/NavBar'
import Toasts from './Toasts'
import CharacterRoutes from './pages/Character'
import Settings from './pages/Settings'
import ChatDetail from './pages/Chat/ChatDetail'
import { settingStore, userStore } from './store'
import LoginPage from './pages/Login'
import ProfilePage from './pages/Profile'
import ChatList from './pages/Chat/ChatList'
import UsersPage from './pages/Admin/UsersPage'
import { InvitesPage } from './pages/Invite/InvitesPage'
import HomePage from './pages/Home'
import Navigation from './Navigation'
import GenerationPresetsPage from './pages/GenerationPresets'

const App: Component = () => {
  const state = userStore()
  userStore.getProfile()
  userStore.getConfig()
  settingStore.getConfig()

  return (
    <div class="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-[var(--hl-900)] flex h-screen flex-col justify-between">
      <NavBar />
      <div class="flex w-full grow flex-row overflow-y-hidden">
        <Navigation />
        <div class="w-full overflow-y-auto">
          <div class="mx-auto h-full w-full max-w-5xl px-2 pt-2 sm:px-3 sm:pt-4 ">
            <Routes>
              <CharacterRoutes />
              <Route path="/chats" component={ChatList} />
              <Route path="/chat" component={ChatDetail} />
              <Route path="/chat/:id" component={ChatDetail} />
              <Route path="/" component={HomePage} />
              <Route path="/presets" component={GenerationPresetsPage} />
              <Route path="/profile" component={ProfilePage} />
              <Route path="/settings" component={Settings} />
              <Show when={state.loggedIn}>
                <Route path="/invites" component={InvitesPage} />
                <Show when={state.user?.admin}>
                  <Route path="/admin/users" component={UsersPage} />
                </Show>
              </Show>
              <Route path="/login" component={LoginPage} />
              <Route path="*" component={HomePage} />
            </Routes>
          </div>
        </div>
      </div>
      <Toasts />
    </div>
  )
}

export default App
