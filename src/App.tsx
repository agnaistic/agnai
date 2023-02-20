import { Component, createEffect } from 'solid-js'
import { Route, Routes } from '@solidjs/router'
import NavBar from './shared/NavBar'
import Toasts from './Toasts'
import CharacterRoutes from './pages/Character'
import LoginPage from './pages/Login'
import HomePage from './pages/Home'
import GenerationSettings from './pages/GenerationSettings'
import Settings from './pages/Settings'
import { settingStore } from './store/settings'
import ChatDetail from './pages/Chat/ChatDetail'

const App: Component = () => {
  const state = settingStore()
  createEffect(() => {
    if (!state.init) settingStore.load()
  })

  return (
    <div class="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-purple-900 flex h-screen flex-col justify-between">
      <NavBar />
      <div class="w-full grow overflow-y-scroll px-8 pt-8 max-sm:px-3">
        <div class="mx-auto h-full max-w-4xl">
          <Routes>
            <Route path="/chat" component={ChatDetail} />
            <Route path="/chat/:id" component={ChatDetail} />
            <CharacterRoutes />
            <Route path="/account/login" component={LoginPage} />
            <Route path="/" component={HomePage} />
            <Route path="/generation-settings" component={GenerationSettings} />
            <Route path="/settings" component={Settings} />
          </Routes>
        </div>
      </div>
      <Toasts />
    </div>
  )
}

export default App
