import { JSX, onCleanup, onMount } from 'solid-js'
import { createStore } from './store/create'
import { v4 } from 'uuid'

type NavState = {
  pageId: string
  state: 'main' | 'sub' | 'closed'

  title: JSX.Element | string | null
  header: JSX.Element | null
  body: JSX.Element | null
}

const initial: NavState = {
  pageId: '',
  title: null,
  header: null,
  body: null,
  state: 'main',
}

export const navStore = createStore(
  'nav',
  initial
)((get, set) => {
  return {}
})

type NavOpts = {
  title?: JSX.Element | string
  header?: JSX.Element
  body?: JSX.Element
}

export function useSubNav(opts: NavOpts) {
  const id = v4()
  onMount(() => {
    navStore.setState({
      pageId: id,
      title: opts.title,
      header: opts.header,
      body: opts.body,
    })
  })

  onCleanup(() => {
    const pageId = navStore.getState().pageId
    if (pageId && id !== pageId) return

    navStore.setState({
      pageId: '',
      title: null,
      header: null,
      body: null,
    })
  })
}
