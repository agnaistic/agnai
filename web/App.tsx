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

const App: Component = () => {
  const state = userStore()
  if (state.loggedIn) {
    userStore.getProfile()
    userStore.getConfig()
  }

  return (
    <div class="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-purple-900 flex h-screen flex-col justify-between">
      <NavBar />
      <div class="w-full grow overflow-y-scroll px-8 pt-8 max-sm:px-3">
        <div class="mx-auto h-full max-w-5xl">
          <Show when={!state.loggedIn}>
            <LoginPage />
          </Show>
          <Routes>
            <Show when={state.loggedIn}>
              <Route path="/chat" component={ChatDetail} />
              <Route path="/chat/:id" component={ChatDetail} />
              <CharacterRoutes />
              <Route path="/" component={CharacterList} />
              <Route path="/generation-settings" component={GenerationSettings} />
              <Route path="/profile" component={ProfilePage} />
              <Route path="/settings" component={Settings} />
            </Show>
          </Routes>
        </div>
      </div>
      <Toasts />
    </div>
  )
}

export default App
