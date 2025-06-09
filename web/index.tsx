import { Component } from 'solid-js'
import { render } from 'solid-js/web'
import App from './App'

// if (location.hostname === 'dev.agnai.chat') {
//   window.addEventListener('unload', function () {
//     debugger
//   })

//   window.addEventListener('beforeunload', function () {
//     debugger
//   })
// }

const AppContainer: Component = () => <App />

render(() => <AppContainer />, document.getElementById('root') as HTMLElement)
