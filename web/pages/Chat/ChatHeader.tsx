import './chat-detail.css'
import { Component, createMemo, Show } from 'solid-js'
import { A } from '@solidjs/router'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, Settings } from 'lucide-solid'
import { ADAPTER_LABELS } from '../../../common/adapters'
import { ChatRightPane, chatStore, settingStore, userStore } from '../../store'
import { msgStore } from '../../store'
import { DropMenu } from '../../shared/DropMenu'
import ChatOptions, { ChatModal } from './ChatOptions'
import { usePaneManager } from '/web/shared/hooks'
import { getHeaderBg } from './helpers'
import { ContextState } from '/web/store/context'

export const ChatHeader: Component<{
  ctx: ContextState
  isOwner: boolean
}> = (props) => {
  const pane = usePaneManager()
  const cfg = settingStore()
  const user = userStore()
  const chats = chatStore((s) => ({
    opts: s.opts,
    char: s.active?.char,
    chat: s.active?.chat,
  }))
  const msgs = msgStore((s) => ({ msgs: s.msgs, history: s.messageHistory.length }))

  const headerBg = createMemo(() => getHeaderBg(user.ui.mode))
  const headerUrl = createMemo(() =>
    props.isOwner ? `/character/${chats.char?._id}/chats` : `/chats`
  )

  const togglePane = (paneType: ChatRightPane) => {
    chatStore.option({ options: false })
    pane.update(paneType)
  }

  const setModal = (modal: ChatModal) => {
    chatStore.option({ options: false, modal })
  }

  const adapterLabel = createMemo(() => {
    if (!props.ctx.info) return ''

    const { name, adapter, isThirdParty, presetLabel } = props.ctx.info
    const label = `${ADAPTER_LABELS[adapter]}${isThirdParty ? ' (3rd party)' : ''} - ${
      name || presetLabel
    }`
    return label
  })

  return (
    <>
      <header
        class={`hidden h-9 w-full items-center justify-between rounded-md sm:flex`}
        style={headerBg()}
      >
        <A
          class="ellipsis flex max-w-full cursor-pointer flex-row items-center justify-between gap-4 text-lg font-bold"
          href={headerUrl()}
        >
          <ChevronLeft />
          <div class="ellipsis flex flex-col">
            <span class="overflow-hidden text-ellipsis whitespace-nowrap leading-5">
              {chats.char?.name}
              <Show when={cfg.flags.debug}>
                <span class="ml-2 text-sm font-normal">
                  {msgs.msgs.length}/{msgs.msgs.length + msgs.history}
                </span>
              </Show>
            </span>

            <span class="flex-row items-center gap-4 overflow-hidden text-ellipsis whitespace-nowrap text-sm">
              {chats.chat?.name || ''}
            </span>
          </div>
        </A>

        <div class="flex flex-row gap-3">
          <div class="hidden items-center text-xs italic text-[var(--text-500)] sm:flex">
            {props.isOwner ? adapterLabel() : ''}
          </div>

          <div onClick={() => chatStore.option({ options: 'main' })}>
            <Settings class="icon-button" />
            <DropMenu
              show={chats.opts.options === 'main'}
              close={() => chatStore.option({ options: false })}
              horz="left"
              vert="down"
            >
              <ChatOptions
                adapterLabel={adapterLabel()}
                setModal={setModal}
                togglePane={togglePane}
              />
            </DropMenu>
          </div>

          <Show when={!cfg.fullscreen}>
            <div class="icon-button" onClick={() => settingStore.fullscreen(true)}>
              <ArrowUpRight />
            </div>
          </Show>

          <Show when={cfg.fullscreen}>
            <div class="icon-button" onClick={() => settingStore.fullscreen(false)}>
              <ArrowDownLeft />
            </div>
          </Show>
        </div>
      </header>
    </>
  )
}
