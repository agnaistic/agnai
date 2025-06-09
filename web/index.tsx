window.addEventListener('unload', function () {
  debugger
})

window.addEventListener('beforeunload', function () {
  debugger
})

import { Component } from 'solid-js'
import { render } from 'solid-js/web'
import App from './App'

const AppContainer: Component = () => <App />

render(() => <AppContainer />, document.getElementById('root') as HTMLElement)
