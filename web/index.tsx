import { Component, Show, createEffect, createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import App from './App'

import i18next from 'i18next'
import HttpBackend from 'i18next-http-backend'
import { userStore } from '/web/store'
import { TransProvider } from '@mbarzda/solid-i18next'

const AppContainer: Component = () => {
  const [isReady, setIsReady] = createSignal(false);
	
  const state = userStore()
  
  createEffect(() => {
    let localePath: string

    if (location.port === '1234' || location.port === '3001') {
      localePath = `${location.protocol}//${location.hostname}:3001/locales/{{lng}}/{{ns}}.json`
    } else {
      localePath = 'locales/{{lng}}/{{ns}}.json'
    }

    i18next.use(HttpBackend).init({
      lng: state.ui.language,
      interpolation: {
        escapeValue: true,
      },
      fallbackLng: state.ui.language,
      ns: "translation",
      backend: {
        loadPath: localePath
      }
    }).then(() => setIsReady(true))
		  .catch((err) => console.error(err));
	});

  return (
    <Show when={isReady()} fallback={<div>Loading...</div>}>
      <TransProvider>
        <App />
      </TransProvider>
    </Show>
  )
}

render(() => <AppContainer />, document.getElementById('root') as HTMLElement)
