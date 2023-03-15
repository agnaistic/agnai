import { Menu } from 'lucide-solid'
import { Component, Show } from 'solid-js'
import { A } from '@solidjs/router'
import { settingStore } from '../store'

const NavBar: Component = () => {
  const cfg = settingStore()

  return (
    <Show when={!cfg.fullscreen}>
      <span
        data-header=""
        class="flex justify-between gap-4 border-b-2 border-[var(--bg-800)] bg-[var(--bg-900)] px-4 py-5 shadow-xl max-lg:p-3 sm:hidden"
      >
        <span class="flex w-full items-center justify-between gap-2 font-semibold lg:justify-start">
          <div class="w-8 lg:hidden" onClick={settingStore.menu}>
            <Menu class="focusable-icon-button cursor-pointer" size={32} />
          </div>
          <div>
            <A href="/">
              <span class="rounded-xl bg-[var(--hl-700)] py-2 px-4">Agnaistic</span>
            </A>
          </div>
          <div class="w-8 lg:hidden"></div>
        </span>
      </span>
    </Show>
  )
}
export default NavBar
