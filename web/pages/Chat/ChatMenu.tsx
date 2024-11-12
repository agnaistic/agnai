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
  Trash,
  RotateCcw,
  ChevronLeft,
  Pencil,
  Info,
  Image,
} from 'lucide-solid'
import { AgnaisticModel } from '/web/shared/PresetSettings/Agnaistic'
import { startTour } from '/web/tours'

type NavProps = {
  ctx: ContextState
  togglePane: (paneType: ChatRightPane) => void
  setModal: (model: ChatModal) => void
  adapterLabel: string
}

export const ChatMenu: Component<{
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
    if (!props.ctx.preset) return ''
    const label = `${ADAPTER_LABELS[props.ctx.preset.service!]} - ${props.ctx.preset.name}`
    return label
  })

  useSubNav({
    // title: 'Chat Options',
    header: (
      <ChatMenuTitle ctx={props.ctx} togglePane={togglePane} setModal={setModal} adapterLabel="" />
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

  const canModel = createMemo(() => props.ctx.preset?.service === 'agnaistic')

  const size = 20

  return (
    <>
      <UserProfile />

      <Nav.DoubleItem>
        <Nav.Item class="min-h-8" href={`/character/list`}>
          <ChevronLeft size={16} /> Characters
        </Nav.Item>

        <Nav.Item class="min-h-8" href={`/character/${props.ctx.char?._id}/chats`}>
          <ChevronLeft size={16} /> Chats
        </Nav.Item>
      </Nav.DoubleItem>

      <Nav.Item onClick={() => props.togglePane('participants')}>
        <Users size={size} /> Participants
      </Nav.Item>

      <Nav.Item onClick={() => props.togglePane('chat-settings')}>
        <Settings size={size} /> Edit Chat
      </Nav.Item>

      <Nav.Item onClick={() => props.togglePane('preset')}>
        <Sliders class="min-w-[24px]" width={'24px'} size={size} />
        <span class="min-w-fit">Preset </span>
        <span class="text-500 ellipsis text-xs italic">{props.adapterLabel}</span>
      </Nav.Item>

      <Show when={isOwner()}>
        <Nav.Item onClick={() => props.togglePane('memory')}>
          <Book size={size} /> Memory
        </Nav.Item>
      </Show>

      <Nav.Item onClick={() => props.togglePane('ui')} class="tour-ui">
        <Palette size={size} /> UI
      </Nav.Item>

      <Show when={isOwner()}>
        <Nav.Item onClick={() => props.setModal('graph')} class="tour-chat-graph">
          <Map size={size} /> Chat Graph
        </Nav.Item>
      </Show>

      <Show when={canModel()}>
        <div class="flex w-full justify-center">
          <AgnaisticModel />
        </div>
      </Show>

      <div class="flex flex-wrap justify-center gap-1 text-sm">
        <Nav.Item
          onClick={() => settingStore.modal(true)}
          ariaLabel="Open settings page"
          tooltip="Site Settings"
        >
          <Settings size={size} aria-hidden="true" />
        </Nav.Item>
        <Nav.Item
          onClick={() => settingStore.imageSettings(true)}
          ariaLabel="Image Settings"
          tooltip="Image Settings"
        >
          <Image size={size} aria-hidden="true" />
        </Nav.Item>
        <Nav.Item onClick={() => props.setModal('export')} tooltip="Download Chat">
          <Download size={size} />
        </Nav.Item>
        <Nav.Item onClick={() => props.setModal('restart')} tooltip="Restart Chat">
          <RotateCcw size={size} />
        </Nav.Item>
        <Nav.Item onClick={() => props.setModal('delete')} tooltip="Delete Chat">
          <Trash size={size} />
        </Nav.Item>
        <Nav.Item onClick={() => startTour('chat', true)} tooltip="Chat Guide" menuOpen>
          <Info size={size} />
        </Nav.Item>
      </div>
    </>
  )
}
const ChatMenuTitle: Component<NavProps> = (props) => {
  return (
    <div
      onClick={() => props.togglePane('character')}
      class="bg-700 hover:bg-600 tour-edit-char flex h-8 max-w-[80%] cursor-pointer items-center gap-2 rounded-md px-2"
    >
      <Pencil size={16} color="var(--bg-500)" class="min-h-[12px] min-w-[12px]" />
      <span class="ellipsis text-md">{props.ctx.char?.name}</span>
    </div>
  )
}
