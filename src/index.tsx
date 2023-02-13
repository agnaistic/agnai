import { Component } from 'solid-js'
import { render } from 'solid-js/web'
import { Router } from '@solidjs/router'
import App from './App'

const AppContainer: Component = () => (
  <Router>
    <App />
  </Router>
)

render(() => <AppContainer />, document.getElementById('root') as HTMLElement)
