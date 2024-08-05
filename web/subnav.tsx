import { JSX, onCleanup, onMount } from 'solid-js'
import { createStore } from './store/create'
import { v4 } from 'uuid'

type NavState = {
  pageId: string
  header: JSX.Element | null
  body: JSX.Element | null
  footer: JSX.Element | null

  state: 'main' | 'sub' | 'closed'
}

const initial: NavState = {
  pageId: '',

  header: null,
  body: null,
  footer: null,

  state: 'main',
}

export const navStore = createStore(
  'nav',
  initial
)((get, set) => {
  return {}
})

type NavOpts = {
  header?: JSX.Element
  body?: JSX.Element
  footer?: JSX.Element
}
function useSubNav(opts: NavOpts) {
  const id = v4()
  onMount(() => {
    navStore.setState({
      pageId: id,
      header: opts.header,
      body: opts.body,
      footer: opts.footer,
    })
  })

  onCleanup(() => {
    const pageId = navStore.getState().pageId
    if (pageId && id !== pageId) return

    navStore.setState({
      pageId: '',
      header: null,
      body: null,
      footer: null,
    })
  })
}
