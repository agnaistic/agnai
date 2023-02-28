import { Component, createEffect, Show } from 'solid-js'
import { Route, Routes } from '@solidjs/router'
import NavBar from './shared/NavBar'
import Toasts from './Toasts'
import CharacterRoutes from './pages/Character'
import GenerationSettings from './pages/GenerationSettings'
import Settings from './pages/Settings'
import ChatDetail from './pages/Chat/ChatDetail'
import CharacterList from './pages/Character/CharacterList'
import { userStore } from './store'
import LoginPage from './pages/Login'
import ProfilePage from './pages/Profile'
import Drawer from './pages/Drawer'
import ChatList from './pages/Chat/ChatList'
import UsersPage from './pages/Admin/UsersPage'

const App: Component = () => {
  const state = userStore()
  if (state.loggedIn) {
    userStore.getProfile()
    userStore.getConfig()
  }

  return (
    <div class="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-purple-900 flex h-screen flex-col justify-between">
      <NavBar />
      <div class="flex w-full grow flex-row overflow-y-hidden">
        <Drawer />
        <div class="w-full overflow-y-auto">
          <div class="mx-auto h-full w-full max-w-5xl px-2 pt-2 sm:px-3 sm:pt-4 ">
            <Show when={!state.loggedIn}>
              <LoginPage />
            </Show>
            <Routes>
              <Show when={state.loggedIn}>
                <Route path="/chats" component={ChatList} />
                <Route path="/chat" component={ChatDetail} />
                <Route path="/chat/:id" component={ChatDetail} />
                <CharacterRoutes />
                <Route path="/" component={CharacterList} />
                <Route path="/generation-settings" component={GenerationSettings} />
                <Route path="/profile" component={ProfilePage} />
                <Route path="/settings" component={Settings} />
                <Show when={state.user?.admin}>
                  <Route path="/admin/users" component={UsersPage} />
                </Show>
              </Show>
            </Routes>
          </div>
        </div>
      </div>
      <Toasts />
    </div>
  )
}

export default App
