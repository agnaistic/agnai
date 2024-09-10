import { Menu } from 'lucide-solid'
import { Component, Show } from 'solid-js'
import { A } from '@solidjs/router'
import { chatStore, settingStore } from '../store'
import { isChatPage } from './hooks'

const NavBar: Component = () => {
  const chats = chatStore((s) => ({
    chat: s.active?.chat,
    char: s.active?.char,
    loaded: s.loaded,
    opts: s.opts,
  }))

  const isChat = isChatPage()

  const Title = (
    <A href="/">
      <div class="flex w-full justify-center">
        Agn<span class="text-[var(--hl-500)]">ai</span>
      </div>
    </A>
  )

  return (
    <Show when={!isChat()}>
      <div
        data-header=""
        class={`bg-900 sm:none flex h-[48px] justify-between gap-4 border-b-2 border-[var(--bg-800)] px-4 py-3 max-sm:p-1 sm:hidden`}
      >
        <div class="flex w-full max-w-5xl items-center justify-between gap-2 font-semibold sm:justify-start">
          <div class={`w-8 sm:hidden`} onClick={() => settingStore.menu()}>
            <Menu class="focusable-icon-button cursor-pointer" size={32} />
          </div>
          <div class="ellipsis flex w-full flex-col">
            <Show when={isChat()} fallback={Title}>
              <span class="w-full text-center text-[0.6rem]">
                Agn<span class="text-[var(--hl-500)]">ai</span>
              </span>
              <span class="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center">
                {chats.loaded ? chats.char?.name : '...'}
              </span>
            </Show>
          </div>
          <div class="w-8 sm:hidden"></div>
        </div>
      </div>
    </Show>
  )
}
export default NavBar
