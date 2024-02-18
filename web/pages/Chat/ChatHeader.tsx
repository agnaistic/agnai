import './chat-detail.css'
import { Component, createMemo, createSignal, Show } from 'solid-js'
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
import { ConfirmModal } from '/web/shared/Modal'
import { TitleCard } from '/web/shared/Card'

export const ChatHeader: Component<{
  ctx: ContextState
  isOwner: boolean
  showOpts: boolean
  setShowOpts: (show: boolean) => void
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

  const [confirm, setConfirm] = createSignal(false)

  const togglePane = (paneType: ChatRightPane) => {
    props.setShowOpts(false)
    pane.update(paneType)
  }

  const setModal = (modal: ChatModal) => {
    props.setShowOpts(false)
    chatStore.option('modal', modal)
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

          <div class="" onClick={() => props.setShowOpts(true)}>
            <Settings class="icon-button" />
            <DropMenu
              show={props.showOpts}
              close={() => props.setShowOpts(false)}
              horz="left"
              vert="down"
            >
              <ChatOptions
                adapterLabel={adapterLabel()}
                setModal={setModal}
                setConfirm={setConfirm}
                togglePane={togglePane}
                close={() => props.setShowOpts(false)}
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
      <ConfirmModal
        message={
          <TitleCard type="rose" class="flex flex-col gap-4">
            <div class="flex justify-center font-bold">Are you sure?</div>
            <div>This will delete ALL messages in this conversation.</div>
          </TitleCard>
        }
        show={confirm()}
        close={() => setConfirm(false)}
        confirm={() => {
          chatStore.restartChat(chats.chat!._id)
          props.setShowOpts(false)
        }}
      />
    </>
  )
}
