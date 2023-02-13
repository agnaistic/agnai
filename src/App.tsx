import { Component, lazy } from 'solid-js'
import { Route, Routes } from '@solidjs/router'
import NavBar from './shared/NavBar'

const App: Component = () => (
  <div class="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-purple-900 flex h-screen flex-col justify-between">
    <NavBar />
    <div class="w-full grow overflow-y-scroll px-8 pt-8 max-sm:px-3">
      <div class="mx-auto h-full max-w-4xl">
        <Routes>
          <Route path="/chat" component={lazy(() => import('./pages/Chat'))} />
          <Route path="/character" component={lazy(() => import('./pages/CharacterSettings'))} />
          <Route path="/" component={lazy(() => import('./pages/Home'))} />
          <Route path="/account/login" component={lazy(() => import('./pages/Login'))} />
          <Route
            path="/generation-settings"
            component={lazy(() => import('./pages/GenerationSettings'))}
          />
          <Route path="/settings" component={lazy(() => import('./pages/Settings'))} />
        </Routes>
      </div>
    </div>
  </div>
)

export default App
