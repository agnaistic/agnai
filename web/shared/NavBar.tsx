import { Menu, MoreHorizontal } from 'lucide-solid'
import { Component, Show, createMemo, createSignal } from 'solid-js'
import { A, useLocation } from '@solidjs/router'
import { ChatRightPane, chatStore, settingStore } from '../store'
import ChatOptions, { ChatModal } from '../pages/Chat/ChatOptions'
import { DropMenu } from './DropMenu'
import { getClientPreset } from './adapter'
import { ADAPTER_LABELS } from '/common/adapters'

const NavBar: Component = () => {
  const cfg = settingStore()
  const location = useLocation()
  const chats = chatStore((s) => ({
    chat: s.active?.chat,
    char: s.active?.char,
    loaded: s.loaded,
    opts: s.opts,
  }))

  const [showOpts, setShowOpts] = createSignal(false)

  const isChat = createMemo(() => {
    return location.pathname.startsWith('/chat/')
  })

  const setModal = (modal: ChatModal) => {
    setShowOpts(false)
    chatStore.option('modal', modal)
    settingStore.toggleOverlay(false)
  }

  const togglePane = (paneType: ChatRightPane) => {
    setShowOpts(false)
    chatStore.option('pane', chatStore.getState().opts.pane === paneType ? undefined : paneType)
    settingStore.toggleOverlay(false)
  }

  const Title = (
    <A href="/">
      <div class="flex w-full justify-center">
        Agn<span class="text-[var(--hl-500)]">ai</span>stic
      </div>
    </A>
  )

  const chatPreset = createMemo(() => getClientPreset(chats.chat))

  const adapterLabel = createMemo(() => {
    const data = chatPreset()
    if (!data) return ''

    const { name, adapter, isThirdParty, presetLabel } = data

    const label = `${ADAPTER_LABELS[adapter]}${isThirdParty ? ' (3rd party)' : ''} - ${
      name || presetLabel
    }`
    return label
  })

  return (
    <Show when={!cfg.fullscreen}>
      <span
        data-header=""
        class={`bg-900 flex h-[48px] justify-between gap-4 border-b-2 border-[var(--bg-800)] px-4 py-3 max-sm:p-1 sm:hidden`}
      >
        <span class="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 font-semibold sm:justify-start">
          <div class={`w-8 sm:hidden`} onClick={settingStore.menu}>
            <Menu class="focusable-icon-button cursor-pointer" size={32} />
          </div>
          <div class="ellipsis flex w-full flex-col">
            <Show when={isChat()} fallback={Title}>
              <span class="w-full text-center text-[0.6rem]">
                Agn<span class="text-[var(--hl-500)]">ai</span>stic
              </span>
              <span class="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center">
                {chats.loaded ? chats.char?.name : '...'}
              </span>
            </Show>
          </div>
          <Show when={isChat()} fallback={<div class="w-8 sm:hidden"></div>}>
            <div class="" onClick={() => setShowOpts(true)}>
              <MoreHorizontal class="icon-button" />
              <DropMenu show={showOpts()} close={() => setShowOpts(false)} horz="left" vert="down">
                <ChatOptions
                  setModal={setModal}
                  togglePane={togglePane}
                  adapterLabel={adapterLabel()}
                  close={() => setShowOpts(false)}
                />
              </DropMenu>
            </div>
          </Show>
        </span>
      </span>
    </Show>
  )
}
export default NavBar
