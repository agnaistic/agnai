import { Component } from 'solid-js'
import { render } from 'solid-js/web'
import { Router } from '@solidjs/router'
import App from './App'

const AppContainer: Component = () => <App />

render(() => <AppContainer />, document.getElementById('root') as HTMLElement)
