import { Menu, MoreHorizontal } from 'lucide-solid'
import { Component, Show, createMemo, createSignal } from 'solid-js'
import { A, useLocation } from '@solidjs/router'
import { chatStore, settingStore } from '../store'
import ChatOptions, { ChatModal } from '../pages/Chat/ChatOptions'
import { DropMenu } from './DropMenu'

const NavBar: Component = () => {
  const cfg = settingStore()
  const location = useLocation()
  const chats = chatStore((s) => ({
    chat: s.active?.chat,
    char: s.active?.char,
    loaded: s.loaded,
  }))

  const [showOpts, setShowOpts] = createSignal(false)

  const isChat = createMemo(() => {
    return location.pathname.startsWith('/chat/')
  })

  const setModal = (modal: ChatModal) => {
    setShowOpts(false)
    chatStore.option('modal', modal)
  }

  const Title = (
    <A href="/">
      Agn<span class="rounded-xl text-[var(--hl-500)]">ai</span>stic
    </A>
  )

  return (
    <Show when={!cfg.fullscreen}>
      <span
        data-header=""
        class="flex justify-between gap-4 border-b-2 border-[var(--bg-800)] bg-[var(--bg-900)] px-4 py-5 max-sm:p-3 sm:hidden"
      >
        <span class="flex w-full items-center justify-between gap-2 font-semibold sm:justify-start">
          <div class="w-8 sm:hidden" onClick={settingStore.menu}>
            <Menu class="focusable-icon-button cursor-pointer" size={32} />
          </div>
          <div class="ellipsis">
            <Show when={isChat()} fallback={Title}>
              <span class="overflow-hidden text-ellipsis whitespace-nowrap">
                {chats.loaded ? chats.char?.name : '...'}
              </span>
            </Show>
          </div>
          <Show when={isChat()} fallback={<div class="w-8 sm:hidden"></div>}>
            <div class="" onClick={() => setShowOpts(true)}>
              <MoreHorizontal class="icon-button" />
              <DropMenu show={showOpts()} close={() => setShowOpts(false)} horz="left" vert="down">
                <ChatOptions setModal={setModal} />
              </DropMenu>
            </div>
          </Show>
        </span>
      </span>
    </Show>
  )
}
export default NavBar
