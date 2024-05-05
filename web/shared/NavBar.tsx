import { Menu, MoreHorizontal } from 'lucide-solid'
import { Component, Show, createMemo } from 'solid-js'
import { A, useLocation } from '@solidjs/router'
import { ChatRightPane, chatStore, settingStore } from '../store'
import ChatOptions, { ChatModal } from '../pages/Chat/ChatOptions'
import { DropMenu } from './DropMenu'
import { getClientPreset } from './adapter'
import { ADAPTER_LABELS } from '/common/adapters'
import { usePaneManager } from './hooks'

const NavBar: Component = () => {
  const cfg = settingStore()
  const location = useLocation()
  const pane = usePaneManager()
  const chats = chatStore((s) => ({
    chat: s.active?.chat,
    char: s.active?.char,
    loaded: s.loaded,
    opts: s.opts,
  }))

  const isChat = createMemo(() => {
    return location.pathname.startsWith('/chat/')
  })

  const setModal = (modal: ChatModal) => {
    chatStore.option({ options: false, modal })
  }

  const togglePane = (paneType: ChatRightPane) => {
    chatStore.option({ options: false })
    pane.update(paneType)
  }

  const Title = (
    <A href="/">
      <div class="flex w-full justify-center">
        Agn<span class="text-[var(--hl-500)]">ai</span>
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
      <div
        data-header=""
        class={`bg-900 sm:none flex h-[48px] justify-between gap-4 border-b-2 border-[var(--bg-800)] px-4 py-3 max-sm:p-1 sm:hidden`}
      >
        <div class="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 font-semibold sm:justify-start">
          <div class={`w-8 sm:hidden`} onClick={settingStore.menu}>
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
          <Show when={isChat()} fallback={<div class="w-8 sm:hidden"></div>}>
            <div onClick={() => chatStore.option({ options: 'mobile' })}>
              <MoreHorizontal class="icon-button" />
              <DropMenu
                show={chats.opts.options === 'mobile'}
                close={() => chatStore.option({ options: false })}
                horz="left"
                vert="down"
              >
                <ChatOptions
                  setModal={setModal}
                  togglePane={togglePane}
                  adapterLabel={adapterLabel()}
                />
              </DropMenu>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  )
}
export default NavBar
