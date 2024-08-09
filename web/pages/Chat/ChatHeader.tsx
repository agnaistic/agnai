import './chat-detail.css'
import { Component, createMemo, Show } from 'solid-js'
import { ADAPTER_LABELS } from '../../../common/adapters'
import { ChatRightPane, chatStore, settingStore } from '../../store'
import { ChatModal } from './ChatOptions'
import { usePaneManager } from '/web/shared/hooks'
import { ContextState } from '/web/store/context'
import { useSubNav } from '/web/subnav'
import { Nav, UserProfile } from '/web/Navigation'
import {
  Book,
  Palette,
  Settings,
  Sliders,
  Users,
  Map,
  Download,
  VenetianMask,
  Trash,
  RotateCcw,
  ChevronLeft,
  ExternalLink,
} from 'lucide-solid'

type NavProps = {
  ctx: ContextState
  togglePane: (paneType: ChatRightPane) => void
  setModal: (model: ChatModal) => void
  adapterLabel: string
}

export const ChatHeader: Component<{
  ctx: ContextState
  isOwner: boolean
}> = (props) => {
  const pane = usePaneManager()

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

  useSubNav({
    title: 'Chat Options',
    header: (
      <ChatCharacter ctx={props.ctx} togglePane={togglePane} setModal={setModal} adapterLabel="" />
    ),
    body: (
      <ChatNav
        ctx={props.ctx}
        togglePane={togglePane}
        setModal={setModal}
        adapterLabel={adapterLabel()}
      />
    ),
  })

  return null
}

const ChatNav: Component<NavProps> = (props) => {
  const isOwner = createMemo(
    () => props.ctx.chat?.userId === props.ctx.user?._id && props.ctx.chat?.mode !== 'companion'
  )

  return (
    <>
      <Nav.Item href={`/character/${props.ctx.char?._id}/chats`}>
        <ChevronLeft /> Chats
      </Nav.Item>

      <UserProfile />

      <Nav.Item onClick={() => props.togglePane('participants')}>
        <Users /> Participants
      </Nav.Item>

      <Nav.Item onClick={() => props.togglePane('chat-settings')}>
        <Settings /> Edit Chat
      </Nav.Item>

      <Nav.Item onClick={() => props.togglePane('preset')}>
        <Sliders class="min-w-[24px]" width={'24px'} size={24} />
        <span class="min-w-fit">Preset </span>
        <span class="text-500 ellipsis text-xs italic">{props.adapterLabel}</span>
      </Nav.Item>

      <Show when={isOwner()}>
        <Nav.Item onClick={() => props.togglePane('memory')}>
          <Book /> Memory
        </Nav.Item>
      </Show>

      <Nav.Item onClick={() => props.togglePane('ui')}>
        <Palette /> UI
      </Nav.Item>

      <Show when={isOwner()}>
        <Nav.Item onClick={() => props.setModal('graph')}>
          <Map /> Chat Graph
        </Nav.Item>
      </Show>

      <div class="flex flex-wrap justify-center gap-1 text-sm">
        <Nav.Item onClick={() => settingStore.modal(true)} ariaLabel="Open settings page">
          <Settings aria-hidden="true" />
        </Nav.Item>
        <Nav.Item onClick={() => settingStore.toggleAnonymize()}>
          <VenetianMask />
        </Nav.Item>
        <Nav.Item onClick={() => props.setModal('export')}>
          <Download />
        </Nav.Item>
        <Nav.Item onClick={() => props.setModal('restart')}>
          <RotateCcw />
        </Nav.Item>
        <Nav.Item onClick={() => props.setModal('delete')}>
          <Trash />
        </Nav.Item>
      </div>
    </>
  )
}
const ChatCharacter: Component<NavProps> = (props) => {
  return (
    <Nav.Item onClick={() => props.togglePane('character')} class="max-w-[80%] gap-2">
      {/* <CharacterAvatar char={props.ctx.char!} format={{ corners: 'circle', size: 'xs' }} /> */}
      <span class="ellipsis bold text-sm">{props.ctx.char?.name}</span>
      <ExternalLink size={12} color="var(--bg-700)" class="min-h-[12px] min-w-[12px]" />
    </Nav.Item>
  )
}
