import { Component, createEffect, createMemo, JSX } from 'solid-js'
import { settingStore, userStore } from '../../store'
import NavBar from '../../shared/NavBar'
import Navigation from '../../Navigation'
import Toasts from '../../Toasts'

const MainLayout: Component<{ children: string | JSX.Element }> = (props) => {
  const state = userStore()
  const cfg = settingStore()

  const bg = createMemo(() => {
    const styles: JSX.CSSProperties = {
      'background-image':
        state.background && !cfg.anonymize ? `url(${state.background})` : undefined,
      'background-repeat': 'no-repeat',
      'background-size': 'cover',
      'background-position': 'center',
    }
    return styles
  })

  return (
    <div class="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-[var(--hl-900)] app flex flex-col justify-between">
      <NavBar />
      <div class="flex w-full grow flex-row overflow-y-hidden">
        <Navigation />
        <div class="w-full overflow-y-auto" data-background style={bg()}>
          <div class={`mx-auto h-full w-full max-w-5xl px-2 pt-2 sm:px-3 sm:pt-4`}>
            {props.children}
          </div>
        </div>
      </div>
      <Toasts />
    </div>
  )
}

export default MainLayout
