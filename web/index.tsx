import { Component } from 'solid-js'
import { render } from 'solid-js/web'
import App from './App'
import { TransProvider } from '@mbarzda/solid-i18next'
import i18next from 'i18next'
import HttpBackend from 'i18next-http-backend'
import { userStore } from '/web/store'

const AppContainer: Component = () => {
  const state = userStore()

  const instance = i18next.createInstance(
    {
      lng: state.ui.language,
      fallbackLng: state.ui.language,
      defaultNS: 'translation',
      debug: true,
    },
    (err, t) => {
      if (err) return console.log('something went wrong loading', err)
      t('key') // -> same as i18next.t
    }
  )

  instance.use(HttpBackend)

  let localePath: string

  if (location.port === '1234' || location.port === '3001') {
    localePath = `${location.protocol}//${location.hostname}:3001/locales/{{lng}}/{{ns}}.json`
  } else {
    localePath = 'locales/{{lng}}/{{ns}}.json'
  }

  const backend = {
    loadPath: localePath,
  }

  return (
    <TransProvider instance={instance} options={{ backend }}>
      <App />
    </TransProvider>
  )
}

render(() => <AppContainer />, document.getElementById('root') as HTMLElement)
